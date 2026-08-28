"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { nextFleaMarketItemCode } from "@/lib/bringbuy/codes";

/** Identifies the caller of the own-items actions below: either a logged-in
 * Meeple (own login, no token, #266) or a token-identified external seller
 * (`findExternalSellerByToken`). Exactly one of the two is set. */
export type FleaMarketSellerRef =
  | { sellerMeepleId: string; externalSellerId?: undefined }
  | { sellerMeepleId?: undefined; externalSellerId: string };

export type OwnFleaMarketItemInput = {
  title: string;
  language: string;
  priceEuros: number;
};

function validateOwnItemInput(input: OwnFleaMarketItemInput) {
  if (!input.title.trim()) return "Bitte einen Titel angeben.";
  if (!input.language.trim()) return "Bitte eine Sprache angeben.";
  if (!Number.isInteger(input.priceEuros) || input.priceEuros < 0) {
    return "Bitte einen gültigen Preis angeben.";
  }
  return null;
}

/** Meeple und externe Verkäufer:in melden Artikel gleichermaßen als
 * `PENDING` an (#266) — die Freigabe zu `FOR_SALE` bleibt in jedem Fall
 * Aufgabe der Kassenperson bei physischer Übergabe (unverändert ggü. #211). */
export async function createOwnFleaMarketItem(
  eventId: string,
  seller: FleaMarketSellerRef,
  input: OwnFleaMarketItemInput,
) {
  const validationError = validateOwnItemInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const existing = await prisma.fleaMarketItem.findMany({
    select: { code: true },
  });
  const code = nextFleaMarketItemCode(existing.map((item) => item.code));

  await prisma.fleaMarketItem.create({
    data: {
      code,
      eventId,
      sellerMeepleId: seller.sellerMeepleId ?? null,
      externalSellerId: seller.externalSellerId ?? null,
      title: input.title.trim(),
      language: input.language.trim(),
      priceEuros: input.priceEuros,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/bringbuy");
  return { success: true as const };
}

/** Nur `PENDING`-Artikel sind für die Verkäufer:in selbst bearbeitbar
 * (#266) — danach hat die Kasse die Hoheit über den Artikel. `seller` steht
 * bewusst vor `itemId`: die Seite bindet ihn serverseitig fest
 * (`updateOwnFleaMarketItem.bind(null, seller)`), `itemId`/`input` bleiben
 * die vom Client gewählten Argumente. */
export async function updateOwnFleaMarketItem(
  seller: FleaMarketSellerRef,
  itemId: string,
  input: OwnFleaMarketItemInput,
) {
  const item = await prisma.fleaMarketItem.findUnique({
    where: { id: itemId },
  });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }
  const isOwner = seller.sellerMeepleId
    ? item.sellerMeepleId === seller.sellerMeepleId
    : item.externalSellerId === seller.externalSellerId;
  if (!isOwner) {
    return { error: "Dieser Artikel gehört dir nicht." };
  }
  if (item.status !== "PENDING") {
    return {
      error: "Nur noch nicht freigegebene Artikel können bearbeitet werden.",
    };
  }

  const validationError = validateOwnItemInput(input);
  if (validationError) {
    return { error: validationError };
  }

  await prisma.fleaMarketItem.update({
    where: { id: itemId },
    data: {
      title: input.title.trim(),
      language: input.language.trim(),
      priceEuros: input.priceEuros,
    },
  });

  revalidatePath("/admin/bringbuy");
  return { success: true as const };
}

export type OwnFleaMarketItemView = {
  id: string;
  code: string;
  title: string;
  language: string | null;
  priceEuros: number;
  status: string;
};

export async function listOwnFleaMarketItems(
  eventId: string,
  seller: FleaMarketSellerRef,
): Promise<OwnFleaMarketItemView[]> {
  const items = await prisma.fleaMarketItem.findMany({
    where: {
      eventId,
      ...(seller.sellerMeepleId
        ? { sellerMeepleId: seller.sellerMeepleId }
        : { externalSellerId: seller.externalSellerId }),
    },
    orderBy: { createdAt: "desc" },
  });
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    language: item.language,
    priceEuros: item.priceEuros,
    status: item.status,
  }));
}

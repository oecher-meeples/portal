"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMember } from "@/lib/auth/session";
import { isBringAndBuyMarketOpen } from "@/lib/events/upcoming";
import { nextFleaMarketItemCode } from "@/lib/bringbuy/codes";
import {
  findExternalSellerByToken,
  type FleaMarketSellerRef,
} from "@/lib/bringbuy/queries";

/**
 * Verkäufer-Selbstbedienung (#266). Die Verkäufer-Identität wird in jeder
 * Action **serverseitig** aufgelöst (#519) — Mitglied über die Session,
 * externe Verkäufer:in über den erneut geprüften Token. Gebundene Argumente
 * (`.bind(null, …)`) gehen an den Client und kommen manipulierbar zurück;
 * eine gebundene `sellerMeepleId` wäre daher keine Autorisierung. Der Token
 * dagegen *ist* der Berechtigungsnachweis und darf gebunden werden.
 */

export type OwnFleaMarketItemInput = {
  title: string;
  language: string;
  priceEuros: number;
};

type ActionResult = { success: true } | { error: string };

const INVALID_TOKEN_ERROR = "Dieser Verkäufer-Link ist nicht (mehr) gültig.";
const MARKET_CLOSED_ERROR =
  "Der Bring&Buy-Markt ist für dieses Event nicht geöffnet.";

function validateOwnItemInput(input: OwnFleaMarketItemInput) {
  if (!input.title.trim()) return "Bitte einen Titel angeben.";
  if (!input.language.trim()) return "Bitte eine Sprache angeben.";
  if (!Number.isInteger(input.priceEuros) || input.priceEuros < 0) {
    return "Bitte einen gültigen Preis angeben.";
  }
  return null;
}

/** Die Seite prüft die Marktöffnung nur für die Anzeige — jede Action prüft
 * sie erneut (#519). */
async function isMarketOpen(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  return !!event && isBringAndBuyMarketOpen(event);
}

async function meepleSeller(): Promise<FleaMarketSellerRef> {
  const { meeple } = await requireMember();
  return { sellerMeepleId: meeple.id };
}

/** Meeple und externe Verkäufer:in melden Artikel gleichermaßen als
 * `PENDING` an (#266) — die Freigabe zu `FOR_SALE` bleibt in jedem Fall
 * Aufgabe der Kassenperson bei physischer Übergabe (unverändert ggü. #211). */
async function createItemFor(
  seller: FleaMarketSellerRef,
  eventId: string,
  input: OwnFleaMarketItemInput,
): Promise<ActionResult> {
  const validationError = validateOwnItemInput(input);
  if (validationError) {
    return { error: validationError };
  }
  if (!(await isMarketOpen(eventId))) {
    return { error: MARKET_CLOSED_ERROR };
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
 * (#266) — danach hat die Kasse die Hoheit über den Artikel. */
async function updateItemFor(
  seller: FleaMarketSellerRef,
  itemId: string,
  input: OwnFleaMarketItemInput,
): Promise<ActionResult> {
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
  if (!(await isMarketOpen(item.eventId))) {
    return { error: MARKET_CLOSED_ERROR };
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

export async function createOwnFleaMarketItemAsMeeple(
  eventId: string,
  input: OwnFleaMarketItemInput,
) {
  return createItemFor(await meepleSeller(), eventId, input);
}

export async function updateOwnFleaMarketItemAsMeeple(
  itemId: string,
  input: OwnFleaMarketItemInput,
) {
  return updateItemFor(await meepleSeller(), itemId, input);
}

/** Das Event kommt aus dem Token, nicht vom Client — ein externer Verkäufer
 * ist immer genau an ein Event gebunden. */
export async function createOwnFleaMarketItemWithToken(
  token: string,
  input: OwnFleaMarketItemInput,
) {
  const seller = await findExternalSellerByToken(token);
  if (!seller) return { error: INVALID_TOKEN_ERROR };
  return createItemFor({ externalSellerId: seller.id }, seller.eventId, input);
}

export async function updateOwnFleaMarketItemWithToken(
  token: string,
  itemId: string,
  input: OwnFleaMarketItemInput,
) {
  const seller = await findExternalSellerByToken(token);
  if (!seller) return { error: INVALID_TOKEN_ERROR };
  return updateItemFor({ externalSellerId: seller.id }, itemId, input);
}

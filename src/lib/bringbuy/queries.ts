import "server-only";

import { prisma } from "@/lib/utils/prisma";
import { isFleaMarketExternalSellerTokenValid } from "@/lib/bringbuy/status";

/**
 * Reine Lesefunktionen für Bring&Buy (#519) — bewusst **ohne** `"use server"`:
 * jeder Export einer `"use server"`-Datei ist ein per POST aufrufbarer
 * Endpunkt, und diese Funktionen prüfen selbst keine Berechtigung. Aufrufer
 * sind die (selbst geschützten) Seiten und die Actions in `own-items.ts`.
 */

/** Identifies a seller: either a logged-in Meeple (own login, no token,
 * #266) or a token-identified external seller (`findExternalSellerByToken`).
 * Exactly one of the two is set. Wird nur serverseitig aufgelöst, nie vom
 * Client entgegengenommen (#519). */
export type FleaMarketSellerRef =
  | { sellerMeepleId: string; externalSellerId?: undefined }
  | { sellerMeepleId?: undefined; externalSellerId: string };

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

export type ExternalSellerContext = {
  id: string;
  eventId: string;
  name: string;
};

/** Löst einen Verkäufer-Token auf — `null` bei unbekanntem oder nicht mehr
 * gültigem Token (alle Artikel bereits in einem Endzustand, siehe
 * `isFleaMarketExternalSellerTokenValid`). */
export async function findExternalSellerByToken(
  token: string,
): Promise<ExternalSellerContext | null> {
  const seller = await prisma.fleaMarketExternalSeller.findUnique({
    where: { token },
    include: { items: { select: { status: true } } },
  });
  if (!seller) return null;
  if (!isFleaMarketExternalSellerTokenValid(seller.items)) return null;

  return { id: seller.id, eventId: seller.eventId, name: seller.name };
}

/** Liste der zwischengespeicherten, reservierten Warenkörbe eines Events
 * (#266) — für den "Reservierte Warenkörbe"-Tab der Kassenansicht. */
export async function listReservedFleaMarketCarts(eventId: string) {
  const carts = await prisma.fleaMarketCart.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return carts.map((cart) => ({
    id: cart.id,
    name: cart.name,
    createdAt: cart.createdAt,
    itemIds: cart.items.map((item) => item.id),
    totalEuros: cart.items.reduce((sum, item) => sum + item.priceEuros, 0),
  }));
}

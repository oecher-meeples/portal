"use server";

import { revalidatePath } from "next/cache";
import type { FleaMarketItemStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { hasRoleGrantedPermission } from "@/lib/events/shift-rights";
import { FLEA_MARKET_CASHIER_PERMISSION_KEY } from "@/lib/bringbuy/cashier-permission";
import { canTransitionFleaMarketItemStatus } from "@/lib/bringbuy/status";

/**
 * Kassen-Berechtigungsprüfung + Kassenaktionen (Freigabe, Statuswechsel,
 * Warenkorb) — verschoben von `components/feature/admin-bringbuy/
 * cashier-actions.ts` nach hier (#266): sowohl die Kassenansicht als auch
 * die neue Verkäufer-Registrierungsseite brauchen dieselbe Logik, die
 * Layer-Regel verbietet aber einen Cross-Feature-Import zwischen den beiden.
 */
export async function requireCashierRights() {
  const meeple = await requireMeeple();
  const allowed = await hasRoleGrantedPermission(
    meeple.id,
    FLEA_MARKET_CASHIER_PERMISSION_KEY,
  );
  if (!allowed) {
    throw new Error(
      "Keine Kassenberechtigung — weder events:manage noch eine aktive Schicht, deren Rolle diese Rechte gewährt.",
    );
  }
  return meeple;
}

export async function approveFleaMarketItem(itemId: string) {
  const item = await prisma.fleaMarketItem.findUnique({
    where: { id: itemId },
  });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }

  let meeple;
  try {
    meeple = await requireCashierRights();
  } catch (error) {
    return { error: (error as Error).message };
  }

  if (item.status !== "PENDING") {
    return { error: "Nur wartende Artikel können freigegeben werden." };
  }

  await prisma.fleaMarketItem.update({
    where: { id: itemId },
    data: {
      status: "FOR_SALE",
      approvedAt: new Date(),
      approvedByMeepleId: meeple.id,
    },
  });

  revalidatePath("/admin/bringbuy");
  return { success: true as const };
}

export async function setFleaMarketItemStatus(
  itemId: string,
  status: FleaMarketItemStatus,
) {
  const item = await prisma.fleaMarketItem.findUnique({
    where: { id: itemId },
  });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }

  try {
    await requireCashierRights();
  } catch (error) {
    return { error: (error as Error).message };
  }

  if (!canTransitionFleaMarketItemStatus(item.status, status)) {
    return {
      error: `Statuswechsel von ${item.status} zu ${status} ist nicht erlaubt.`,
    };
  }

  await prisma.fleaMarketItem.update({
    where: { id: itemId },
    data: { status, cartId: status === "SOLD" ? null : item.cartId },
  });

  await deleteEmptyCart(item.cartId);
  revalidatePath("/admin/bringbuy");
  return { success: true as const };
}

export async function findFleaMarketItemByCode(eventId: string, code: string) {
  try {
    await requireCashierRights();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const item = await prisma.fleaMarketItem.findFirst({
    where: { eventId, code: code.trim().toUpperCase() },
  });

  if (!item) {
    return { error: "Kein Artikel mit diesem Code gefunden." };
  }

  return { success: true as const, item };
}

async function deleteEmptyCart(cartId: string | null) {
  if (!cartId) return;
  const remaining = await prisma.fleaMarketItem.count({ where: { cartId } });
  if (remaining === 0) {
    await prisma.fleaMarketCart.delete({ where: { id: cartId } }).catch(() => {
      // Bereits gelöscht (paralleler Request) — kein Fehlerfall.
    });
  }
}

/**
 * Warenkorb-Workflow für die Kassenperson (#266): mehrere `FOR_SALE`-Artikel
 * gemeinsam verkaufen. Ohne Warenkorb (einzelner Artikel) identische Logik —
 * der Aufrufer übergibt dann einfach eine Liste mit einem Element.
 */
export async function sellFleaMarketItems(itemIds: string[]) {
  try {
    await requireCashierRights();
  } catch (error) {
    return { error: (error as Error).message };
  }
  if (itemIds.length === 0) {
    return { error: "Kein Artikel ausgewählt." };
  }

  const items = await prisma.fleaMarketItem.findMany({
    where: { id: { in: itemIds } },
  });
  const invalid = items.find(
    (item) => !canTransitionFleaMarketItemStatus(item.status, "SOLD"),
  );
  if (invalid || items.length !== itemIds.length) {
    return {
      error:
        "Nur Artikel im Status „Verfügbar“ oder „Reserviert“ können verkauft werden.",
    };
  }

  const cartIds = new Set(
    items.map((item) => item.cartId).filter((id): id is string => !!id),
  );

  await prisma.fleaMarketItem.updateMany({
    where: { id: { in: itemIds } },
    data: { status: "SOLD", cartId: null },
  });
  for (const cartId of cartIds) {
    await deleteEmptyCart(cartId);
  }

  revalidatePath("/admin/bringbuy");
  return { success: true as const };
}

/** "Reservieren" auf dem Warenkorb (#266): legt einen benannten,
 * persistenten `FleaMarketCart` an und setzt alle enthaltenen Artikel auf
 * `RESERVED` — erscheint danach im Tab "Reservierte Warenkörbe". */
export async function reserveFleaMarketCart(
  eventId: string,
  itemIds: string[],
  name: string,
) {
  try {
    await requireCashierRights();
  } catch (error) {
    return { error: (error as Error).message };
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Namen für den Warenkorb angeben." };
  }
  if (itemIds.length === 0) {
    return { error: "Kein Artikel ausgewählt." };
  }

  const items = await prisma.fleaMarketItem.findMany({
    where: { id: { in: itemIds }, eventId },
  });
  if (
    items.length !== itemIds.length ||
    items.some((i) => i.status !== "FOR_SALE")
  ) {
    return {
      error: "Nur verfügbare Artikel dieses Events können reserviert werden.",
    };
  }

  const cart = await prisma.fleaMarketCart.create({
    data: { eventId, name: trimmedName },
  });
  await prisma.fleaMarketItem.updateMany({
    where: { id: { in: itemIds } },
    data: { status: "RESERVED", cartId: cart.id },
  });

  revalidatePath("/admin/bringbuy");
  return { success: true as const, cartId: cart.id };
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

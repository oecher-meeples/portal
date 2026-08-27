"use server";

import { revalidatePath } from "next/cache";
import type { FleaMarketItemStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { hasRoleGrantedPermission } from "@/lib/events/shift-rights";

/** Muss zum in prisma/seed-roles.ts gepflegten Permission-Key passen. */
export const FLEA_MARKET_CASHIER_PERMISSION_KEY = "events:manage";

const NEXT_STATUS: Record<FleaMarketItemStatus, FleaMarketItemStatus[]> = {
  PENDING: ["FOR_SALE"],
  FOR_SALE: ["RESERVED", "SOLD"],
  RESERVED: ["FOR_SALE", "SOLD"],
  SOLD: [],
};

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

  if (!NEXT_STATUS[item.status].includes(status)) {
    return {
      error: `Statuswechsel von ${item.status} zu ${status} ist nicht erlaubt.`,
    };
  }

  await prisma.fleaMarketItem.update({
    where: { id: itemId },
    data: { status },
  });

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

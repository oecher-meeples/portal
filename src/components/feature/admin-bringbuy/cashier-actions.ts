"use server";

import { revalidatePath } from "next/cache";
import type { FleaMarketItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMeeple } from "@/lib/meeples";
import { hasFleaMarketRights } from "@/lib/events/shift-rights";

const NEXT_STATUS: Record<FleaMarketItemStatus, FleaMarketItemStatus[]> = {
  PENDING: ["FOR_SALE"],
  FOR_SALE: ["RESERVED", "SOLD"],
  RESERVED: ["FOR_SALE", "SOLD"],
  SOLD: [],
};

async function requireCashierRights(eventId: string) {
  const meeple = await requireMeeple();
  const allowed = await hasFleaMarketRights(meeple.id, eventId);
  if (!allowed) {
    throw new Error(
      "Keine Kassenberechtigung für dieses Event — weder events:manage noch aktive Kasse-Schicht.",
    );
  }
  return meeple;
}

export async function approveFleaMarketItem(itemId: string) {
  const item = await prisma.fleaMarketItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }

  let meeple;
  try {
    meeple = await requireCashierRights(item.eventId);
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
  const item = await prisma.fleaMarketItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }

  try {
    await requireCashierRights(item.eventId);
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
    await requireCashierRights(eventId);
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

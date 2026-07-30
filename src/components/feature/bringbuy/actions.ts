"use server";

import { revalidatePath } from "next/cache";
import type { FleaMarketItemStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { nextFleaMarketItemCode } from "@/lib/bringbuy/codes";

const EDITABLE_STATUSES: FleaMarketItemStatus[] = ["PENDING", "FOR_SALE"];

export async function createFleaMarketItem(
  eventId: string,
  title: string,
  priceEuros: number,
  description?: string,
) {
  const meeple = await requireMeeple();

  if (!title.trim()) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!Number.isInteger(priceEuros) || priceEuros < 0) {
    return { error: "Bitte einen gültigen Preis angeben." };
  }

  const existing = await prisma.fleaMarketItem.findMany({
    select: { code: true },
  });
  const code = nextFleaMarketItemCode(existing.map((item) => item.code));

  const item = await prisma.fleaMarketItem.create({
    data: {
      code,
      eventId,
      sellerMeepleId: meeple.id,
      title: title.trim(),
      description: description?.trim() || null,
      priceEuros,
      status: "PENDING",
    },
  });

  revalidatePath("/markt");
  return { success: true as const, id: item.id, code: item.code };
}

export async function updateOwnFleaMarketItem(
  itemId: string,
  input: { title: string; priceEuros: number; description?: string },
) {
  const meeple = await requireMeeple();

  const item = await prisma.fleaMarketItem.findUnique({
    where: { id: itemId },
  });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }
  if (item.sellerMeepleId !== meeple.id) {
    return { error: "Nur der eigene Artikel kann bearbeitet werden." };
  }
  if (!EDITABLE_STATUSES.includes(item.status)) {
    return {
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr bearbeitet werden.",
    };
  }
  if (!input.title.trim()) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!Number.isInteger(input.priceEuros) || input.priceEuros < 0) {
    return { error: "Bitte einen gültigen Preis angeben." };
  }

  await prisma.fleaMarketItem.update({
    where: { id: itemId },
    data: {
      title: input.title.trim(),
      priceEuros: input.priceEuros,
      description: input.description?.trim() || null,
    },
  });

  revalidatePath("/markt");
  return { success: true as const };
}

export async function deleteOwnFleaMarketItem(itemId: string) {
  const meeple = await requireMeeple();

  const item = await prisma.fleaMarketItem.findUnique({
    where: { id: itemId },
  });
  if (!item) {
    return { error: "Artikel nicht gefunden." };
  }
  if (item.sellerMeepleId !== meeple.id) {
    return { error: "Nur der eigene Artikel kann gelöscht werden." };
  }
  if (!EDITABLE_STATUSES.includes(item.status)) {
    return {
      error:
        "Reservierte oder verkaufte Artikel können nicht mehr gelöscht werden.",
    };
  }

  await prisma.fleaMarketItem.delete({ where: { id: itemId } });

  revalidatePath("/markt");
  return { success: true as const };
}

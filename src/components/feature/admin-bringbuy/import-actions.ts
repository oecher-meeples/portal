"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { nextFleaMarketItemCode } from "@/lib/bringbuy/codes";
import { parseFleaMarketCsv } from "@/lib/bringbuy/csv";
import { requireCashierRights } from "@/lib/bringbuy/actions";

/**
 * Cashier-side bulk import (#211) — replaces the former member self-service
 * flow. Gated the same way as the rest of the cashier view: `events:manage`
 * or an active KASSE shift for this event (ADR 0006), never open to every
 * meeple.
 */
export async function importFleaMarketItemsCsv(eventId: string, raw: string) {
  let meeple;
  try {
    meeple = await requireCashierRights();
  } catch (error) {
    return { created: 0, errors: [], error: (error as Error).message };
  }

  const { items, errors } = parseFleaMarketCsv(raw);

  const existing = await prisma.fleaMarketItem.findMany({
    select: { code: true },
  });
  const usedCodes = existing.map((item) => item.code);

  let created = 0;
  for (const item of items) {
    const code = nextFleaMarketItemCode(usedCodes);
    usedCodes.push(code);

    await prisma.fleaMarketItem.create({
      data: {
        code,
        eventId,
        sellerMeepleId: meeple.id,
        title: item.title,
        description: item.description ?? null,
        priceEuros: item.priceEuros,
        status: "PENDING",
      },
    });
    created += 1;
  }

  revalidatePath("/admin/bringbuy");
  return { created, errors };
}

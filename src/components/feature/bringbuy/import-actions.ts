"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { nextFleaMarketItemCode } from "@/lib/bringbuy/codes";
import { parseFleaMarketCsv } from "@/lib/bringbuy/csv";

export async function importFleaMarketItemsCsv(eventId: string, raw: string) {
  const meeple = await requireMeeple();

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

  revalidatePath("/markt");
  return { created, errors };
}

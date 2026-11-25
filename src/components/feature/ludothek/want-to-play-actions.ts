"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
import { prisma } from "@/lib/utils/prisma";

/** „Ich will das auch spielen" auf der Spieledetailseite (#632-Folge): setzt
 * bzw. entfernt die manuelle Markierung der eigenen Session — nie für eine
 * übergebene Meeple-ID. Idempotent (upsert/deleteMany). */
export async function setWantToPlayMarkAction(
  boardGameId: string,
  marked: boolean,
) {
  const meeple = await requireMeeple();
  if (marked) {
    await prisma.gameWantToPlay.upsert({
      where: {
        meepleId_boardGameId: { meepleId: meeple.id, boardGameId },
      },
      create: { meepleId: meeple.id, boardGameId },
      update: {},
    });
  } else {
    await prisma.gameWantToPlay.deleteMany({
      where: { meepleId: meeple.id, boardGameId },
    });
  }
  revalidatePath("/ludothek", "layout");
  return { success: true as const };
}

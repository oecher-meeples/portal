"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
import { setWantToPlayMark } from "@/lib/ludothek/want-to-play-list";

/** „Ich will das auch spielen" auf der Spieledetailseite (#632-Folge): setzt
 * bzw. entfernt die manuelle Markierung der eigenen Session — nie für eine
 * übergebene Meeple-ID. Idempotent (upsert/deleteMany). */
export async function setWantToPlayMarkAction(
  boardGameId: string,
  marked: boolean,
) {
  const meeple = await requireMeeple();
  await setWantToPlayMark(meeple.id, boardGameId, marked);
  revalidatePath("/ludothek", "layout");
  return { success: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { actionPermissionDenied } from "@/lib/auth/action-guards";
import { requireMeeple } from "@/lib/members/meeples";
import {
  clearWantToPlay,
  listWantToPlay,
  removeWantToPlay,
  type WantToPlayCursor,
} from "@/lib/ludothek/want-to-play-list";

/** Nächste Seite einer Want-to-Play-Liste (#637). Für jede fremde Liste
 * erlaubt, sofern der Betrachter intern ist — die Liste ist intern sichtbar. */
export async function loadMoreWantToPlayAction(
  meepleId: string,
  cursor: WantToPlayCursor,
) {
  const denied = await actionPermissionDenied("ludothek:view");
  if (denied) return denied;
  return {
    success: true as const,
    ...(await listWantToPlay(meepleId, { after: cursor })),
  };
}

/** Eigene Einträge entfernen: nie mit einer vom Client übergebenen
 * Meeple-ID, immer die der Session. */
export async function removeWantToPlayEntryAction(boardGameId: string) {
  const meeple = await requireMeeple();
  await removeWantToPlay(meeple.id, boardGameId);
  revalidatePath("/ludothek", "layout");
  return { success: true as const };
}

export async function clearWantToPlayAction() {
  const meeple = await requireMeeple();
  await clearWantToPlay(meeple.id);
  revalidatePath("/ludothek", "layout");
  return { success: true as const };
}

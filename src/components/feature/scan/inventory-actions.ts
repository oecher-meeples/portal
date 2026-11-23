"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import type { GameIssueKind } from "@/lib/ludothek/game-issue";
import {
  confirmGameCopyCheck,
  reportGameCopyDefect,
} from "@/lib/ludothek/game-copy-checks";

/** Prüfbogen (Scanner-Modus „Kontrollieren", #563) — nur `games:manage`.
 * Jede Kontrolle wird mit dem kontrollierenden Meeple protokolliert (#599). */
export async function confirmGameCondition(
  gameCopyId: string,
  condition: string,
) {
  const actor = await requireActionPermission("games:manage");

  return confirmGameCopyCheck(gameCopyId, actor.meeple.id, condition);
}

export async function reportGameDefect(
  gameCopyId: string,
  kind: GameIssueKind,
  note: string,
) {
  const actor = await requireActionPermission("games:manage");

  return reportGameCopyDefect(gameCopyId, actor.meeple.id, kind, note);
}

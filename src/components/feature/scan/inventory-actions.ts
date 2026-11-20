"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import type { GameIssueKind } from "@/lib/ludothek/game-issue";
import {
  clearGameCopyDefect,
  reportGameCopyDefect,
} from "@/lib/ludothek/game-defects";

/** Prüfbogen (Scanner-Modus „Kontrollieren", #563) — nur `games:manage`. */
export async function confirmGameCondition(
  gameCopyId: string,
  condition: string,
) {
  await requireActionPermission("games:manage");

  await prisma.gameCopy.update({
    where: { id: gameCopyId },
    data: {
      condition: condition.trim() || null,
      lastCheckedAt: new Date(),
      needsCompletenessCheck: false,
    },
  });

  return { success: true as const };
}

export async function reportGameDefect(
  gameCopyId: string,
  kind: GameIssueKind,
  note: string,
) {
  await requireActionPermission("games:manage");

  return reportGameCopyDefect(gameCopyId, kind, note);
}

export async function clearGameDefect(gameCopyId: string) {
  await requireActionPermission("games:manage");

  return clearGameCopyDefect(gameCopyId);
}

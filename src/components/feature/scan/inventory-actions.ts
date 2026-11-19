"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import type { GameIssueKind } from "@/lib/ludothek/game-issue";
import {
  clearGameCopyDefect,
  reportGameCopyDefect,
} from "@/lib/ludothek/game-defects";

export async function confirmGameCondition(
  gameCopyId: string,
  condition: string,
) {
  await requireMeeple();

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
  await requireMeeple();

  return reportGameCopyDefect(gameCopyId, kind, note);
}

export async function clearGameDefect(gameCopyId: string) {
  await requireActionPermission("games:manage");

  return clearGameCopyDefect(gameCopyId);
}

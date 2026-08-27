"use server";

import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { requirePermission } from "@/lib/auth/permissions";

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

/** Die drei "nicht vollständig spielbar"-Zustände im Prüfbogen (#273) —
 * jeweils eigenes Label als Präfix im freien `condition`-Text, da das
 * Datenmodell keine eigene Spielbarkeits-Spalte hat (bewusst kein
 * Schema-Zuwachs für reine UI-Kategorien). */
export type GameIssueKind = "unvollstaendig" | "nicht_spielbar" | "beschaedigt";

export const GAME_ISSUE_LABELS: Record<GameIssueKind, string> = {
  unvollstaendig: "Unvollständig spielbar",
  nicht_spielbar: "Nicht spielbar",
  beschaedigt: "Beschädigt",
};

export async function reportGameDefect(
  gameCopyId: string,
  kind: GameIssueKind,
  note: string,
) {
  await requireMeeple();

  if (!note.trim()) {
    return { error: "Bitte eine Notiz zum Mangel angeben." };
  }

  await prisma.gameCopy.update({
    where: { id: gameCopyId },
    data: {
      condition: `${GAME_ISSUE_LABELS[kind]}: ${note.trim()}`,
      lastCheckedAt: new Date(),
      status: GameInventoryStatus.MAINTENANCE,
    },
  });

  return { success: true as const };
}

export async function clearGameDefect(gameCopyId: string) {
  await requirePermission("games:manage");

  await prisma.gameCopy.update({
    where: { id: gameCopyId },
    data: { status: GameInventoryStatus.ACTIVE },
  });

  return { success: true as const };
}

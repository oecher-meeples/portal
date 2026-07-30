"use server";

import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { requirePermission } from "@/lib/auth/permissions";

export async function confirmGameCondition(
  boardGameId: string,
  condition: string,
) {
  await requireMeeple();

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: {
      condition: condition.trim() || null,
      lastCheckedAt: new Date(),
      needsCompletenessCheck: false,
    },
  });

  return { success: true as const };
}

export async function reportGameDefect(boardGameId: string, note: string) {
  await requireMeeple();

  if (!note.trim()) {
    return { error: "Bitte eine Notiz zum Mangel angeben." };
  }

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: {
      condition: note.trim(),
      lastCheckedAt: new Date(),
      status: GameInventoryStatus.MAINTENANCE,
    },
  });

  return { success: true as const };
}

export async function clearGameDefect(boardGameId: string) {
  await requirePermission("games:manage");

  await prisma.boardGame.update({
    where: { id: boardGameId },
    data: { status: GameInventoryStatus.ACTIVE },
  });

  return { success: true as const };
}

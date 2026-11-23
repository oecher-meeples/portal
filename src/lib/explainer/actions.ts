"use server";

import { revalidatePath } from "next/cache";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";

export async function addExplainerGame(
  boardGameId: string,
  level: ExplainerExperienceLevel,
) {
  const meeple = await requireMeeple();

  if (!boardGameId) {
    return { error: "Bitte ein Spiel auswählen." };
  }

  await prisma.explainerGame.upsert({
    where: { meepleId_boardGameId: { meepleId: meeple.id, boardGameId } },
    update: { level },
    create: { meepleId: meeple.id, boardGameId, level },
  });

  revalidatePath("/erklaerbaeren");
  return { success: true as const };
}

export async function updateExplainerGameLevel(
  boardGameId: string,
  level: ExplainerExperienceLevel,
) {
  const meeple = await requireMeeple();

  const updated = await prisma.explainerGame.updateMany({
    where: { meepleId: meeple.id, boardGameId },
    data: { level },
  });

  if (updated.count === 0) {
    return { error: "Kein eigener Eintrag für dieses Spiel gefunden." };
  }

  revalidatePath("/erklaerbaeren");
  return { success: true as const };
}

export async function removeExplainerGame(boardGameId: string) {
  const meeple = await requireMeeple();

  await prisma.explainerGame.deleteMany({
    where: { meepleId: meeple.id, boardGameId },
  });

  revalidatePath("/erklaerbaeren");
  return { success: true as const };
}

export async function removeAllExplainerGames() {
  const meeple = await requireMeeple();

  await prisma.explainerGame.deleteMany({
    where: { meepleId: meeple.id },
  });

  revalidatePath("/erklaerbaeren");
  return { success: true as const };
}

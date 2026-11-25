"use server";

import { revalidatePath } from "next/cache";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { searchBoardGames } from "@/lib/explainer/game-list-queries";

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

/** Spiel per Suche hinzufügen (#663): neues Niveau „Mit Anleitung“, ein
 * bereits eingetragenes Niveau bleibt unverändert. */
export async function addExplainerGameFromSearch(boardGameId: string) {
  const meeple = await requireMeeple();

  if (!boardGameId) {
    return { error: "Bitte ein Spiel auswählen." };
  }

  await prisma.explainerGame.upsert({
    where: { meepleId_boardGameId: { meepleId: meeple.id, boardGameId } },
    update: {},
    create: { meepleId: meeple.id, boardGameId, level: "WITH_MANUAL" },
  });

  revalidatePath("/erklaerbaeren");
  return { success: true as const };
}

/** Titelsuche über alle Spiele (serverseitig, limitiert) für Tab 1 und Tab 2. */
export async function searchBoardGamesAction(
  query: string,
  excludeIds: string[] = [],
) {
  await requireMeeple();
  return searchBoardGames(query, 10, excludeIds);
}

/** „Erklärer gesucht“ (#660) setzen/entfernen — nur `events:manage`. */
export async function setExplainerWanted(
  boardGameId: string,
  wanted: boolean,
) {
  await requireActionPermission("events:manage");

  const updated = await prisma.boardGame.updateMany({
    where: { id: boardGameId },
    data: { explainerWanted: wanted },
  });
  if (updated.count === 0) {
    return { error: "Spiel nicht gefunden." };
  }

  revalidatePath("/erklaerbaeren");
  revalidatePath("/dashboard");
  return { success: true as const };
}

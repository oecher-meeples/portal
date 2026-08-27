import type { ExplainerExperienceLevel } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type ExplainerEntry = {
  meepleId: string;
  displayName: string;
  level: ExplainerExperienceLevel;
};

/** Erklärbären for one Spiel, sorted by name — used on the Ludothek detail page. */
export async function getExplainersForGame(
  boardGameId: string,
): Promise<ExplainerEntry[]> {
  const entries = await prisma.explainerGame.findMany({
    where: { boardGameId },
    orderBy: { meeple: { displayName: "asc" } },
    include: { meeple: { select: { id: true, displayName: true } } },
  });

  return entries.map((entry) => ({
    meepleId: entry.meeple.id,
    displayName: entry.meeple.displayName,
    level: entry.level,
  }));
}

/** Erklärbären count per title, batched for the Ludothek list view (#143) —
 * a plain count instead of `getExplainersForGame`'s full entries, since the
 * list-row overlay only shows a number, not names/levels. Titles with no
 * Erklärbär are simply absent from the returned map. */
export async function getExplainerCountsForGames(
  boardGameIds: string[],
): Promise<Map<string, number>> {
  if (boardGameIds.length === 0) return new Map();

  const grouped = await prisma.explainerGame.groupBy({
    by: ["boardGameId"],
    where: { boardGameId: { in: boardGameIds } },
    _count: { _all: true },
  });

  return new Map(grouped.map((g) => [g.boardGameId, g._count._all]));
}

/**
 * BoardGame-Ids, für die gerade (während `eventId`) mind. ein anwesender
 * Erklärbär registriert ist — Gast-während-Event-Kontext des "Erklärbär
 * vorhanden"-Filters (#256). Bewusst kein Zeit-Scheduling: `ExplainerAttendance`
 * ist ein reiner "heute anwesend"-Boolean pro Event (CONTEXT.md).
 */
export async function getAttendingExplainerBoardGameIds(
  eventId: string,
): Promise<Set<string>> {
  const attendances = await prisma.explainerAttendance.findMany({
    where: { eventId },
    select: { meepleId: true },
  });
  if (attendances.length === 0) return new Set();

  const games = await prisma.explainerGame.findMany({
    where: { meepleId: { in: attendances.map((a) => a.meepleId) } },
    select: { boardGameId: true },
  });

  return new Set(games.map((g) => g.boardGameId));
}

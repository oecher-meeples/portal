import type { HoldingOrigin } from "@prisma/client";

const LOAN_ORIGINS: HoldingOrigin[] = ["LOAN", "HANDOVER"];

export type LoanStatsHolding = {
  boardGameId: string;
  origin: HoldingOrigin;
  startedAt: Date;
};

export type LoanStatsBoardGame = { id: string; title: string };

export type MostBorrowedGame = {
  boardGameId: string;
  title: string;
  count: number;
};

/**
 * Anonymised: counts only, no meeple references. Ties break stably by title.
 */
export function mostBorrowedGames(
  holdings: LoanStatsHolding[],
  boardGames: LoanStatsBoardGame[],
  limit = 10,
): MostBorrowedGame[] {
  const titleById = new Map(boardGames.map((g) => [g.id, g.title]));
  const countByGameId = new Map<string, number>();

  for (const holding of holdings) {
    if (!LOAN_ORIGINS.includes(holding.origin)) continue;
    countByGameId.set(
      holding.boardGameId,
      (countByGameId.get(holding.boardGameId) ?? 0) + 1,
    );
  }

  return [...countByGameId.entries()]
    .map(([boardGameId, count]) => ({
      boardGameId,
      title: titleById.get(boardGameId) ?? boardGameId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export type WeekdayCount = { weekday: number; count: number };

/** Histogram over `startedAt.getDay()` (0 = Sunday … 6 = Saturday), always 7 entries. */
export function mostActiveLoanWeekdays(
  holdings: LoanStatsHolding[],
): WeekdayCount[] {
  const counts = new Array(7).fill(0);

  for (const holding of holdings) {
    if (!LOAN_ORIGINS.includes(holding.origin)) continue;
    counts[holding.startedAt.getDay()] += 1;
  }

  return counts.map((count, weekday) => ({ weekday, count }));
}

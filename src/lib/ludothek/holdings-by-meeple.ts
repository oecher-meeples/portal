import { prisma } from "@/lib/utils/prisma";

/**
 * One physical copy currently at a Meeple, for `getActiveHoldingsByMeeple()`.
 */
export type ActiveMeepleHolding = {
  gameCopyId: string;
  boardGameTitle: string;
  startedAt: Date;
};

/** All active Meeple-holdings for one Meeple, for the accordion in #272's overview page. */
export type MeepleWithActiveHoldings = {
  meepleId: string;
  meepleName: string;
  holdings: ActiveMeepleHolding[];
};

/**
 * Every currently open person-`GameHolding`, grouped by Meeple (#272) — "wo
 * befinden sich Spiele gerade physisch", not the narrower Ausleihe-Definition
 * from CONTEXT.md. Deliberate deviation from `isLoanHolding()`: a Meeple who
 * is merely receiving a RETURN for storage (not borrowing) still shows up
 * here, since the game is physically with them either way.
 */
export async function getActiveHoldingsByMeeple(): Promise<
  MeepleWithActiveHoldings[]
> {
  const holdings = await prisma.gameHolding.findMany({
    where: { meepleId: { not: null }, endedAt: null },
    orderBy: { startedAt: "asc" },
    select: {
      gameCopyId: true,
      startedAt: true,
      meeple: { select: { id: true, displayName: true } },
      gameCopy: { select: { boardGame: { select: { title: true } } } },
    },
  });

  const byMeeple = new Map<string, MeepleWithActiveHoldings>();
  for (const holding of holdings) {
    if (!holding.meeple) continue;

    const entry = byMeeple.get(holding.meeple.id) ?? {
      meepleId: holding.meeple.id,
      meepleName: holding.meeple.displayName,
      holdings: [],
    };
    entry.holdings.push({
      gameCopyId: holding.gameCopyId,
      boardGameTitle: holding.gameCopy.boardGame.title,
      startedAt: holding.startedAt,
    });
    byMeeple.set(holding.meeple.id, entry);
  }

  return [...byMeeple.values()].sort((a, b) =>
    a.meepleName.localeCompare(b.meepleName, "de"),
  );
}

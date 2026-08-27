import type { RuleBookLanguage } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { formatLocationChain } from "@/lib/ludothek/holdings-lookup";

/**
 * One physical copy currently at a Meeple, for `getActiveHoldingsByMeeple()`.
 * Carries the fields `GameActionsMenu` needs (#272-Folge) — zustand is always
 * "ausgeliehen" here (a person-Holding by definition), so unlike
 * `admin-bestand-rows.ts` there is no unit chain to walk.
 */
export type ActiveMeepleHolding = {
  gameCopyId: string;
  boardGameId: string;
  boardGameTitle: string;
  startedAt: Date;
  locationChain: string;
  condition: string | null;
  ruleBookLanguages: RuleBookLanguage[];
  inventoryNumber: string | null;
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
      gameCopy: {
        select: {
          condition: true,
          ruleBookLanguages: true,
          inventoryNumber: true,
          boardGame: { select: { id: true, title: true } },
        },
      },
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
      boardGameId: holding.gameCopy.boardGame.id,
      boardGameTitle: holding.gameCopy.boardGame.title,
      startedAt: holding.startedAt,
      locationChain: formatLocationChain({
        responsibleName: holding.meeple.displayName,
        unitChain: "",
      }),
      condition: holding.gameCopy.condition,
      ruleBookLanguages: holding.gameCopy.ruleBookLanguages,
      inventoryNumber: holding.gameCopy.inventoryNumber,
    });
    byMeeple.set(holding.meeple.id, entry);
  }

  return [...byMeeple.values()].sort((a, b) =>
    a.meepleName.localeCompare(b.meepleName, "de"),
  );
}

/** Total count of currently active person-`GameHolding`s, for the Ausleihen-Karte
 * auf `admin/bestand` (#272-Folge) — same scope as {@link getActiveHoldingsByMeeple}. */
export async function countActiveMeepleHoldings(): Promise<number> {
  return prisma.gameHolding.count({
    where: { meepleId: { not: null }, endedAt: null },
  });
}

import { prisma } from "@/lib/utils/prisma";

export type OpenHoldingsSummary = { games: number; units: number };

/** What a Meeple still physically holds for the club — the precondition for anonymisation. */
export async function countOpenHoldings(
  meepleId: string,
): Promise<OpenHoldingsSummary> {
  const [games, units] = await Promise.all([
    prisma.gameHolding.count({ where: { meepleId, endedAt: null } }),
    prisma.storageUnit.count({
      where: { keeperMeepleId: meepleId, retiredAt: null },
    }),
  ]);

  return { games, units };
}

export function hasOpenHoldings({ games, units }: OpenHoldingsSummary) {
  return games > 0 || units > 0;
}

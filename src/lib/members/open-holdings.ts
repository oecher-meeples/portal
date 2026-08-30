import { prisma } from "@/lib/utils/prisma";

export type OpenHoldingsSummary = { games: number; units: number };

/**
 * What a Meeple still physically holds for the club — the precondition for
 * anonymisation. `games` counts open `GameHolding`s of the Meeple's linked
 * `Member` (#333: the holding target moved from `Meeple` to `Member`) — a
 * Meeple with no linked Member (Systemkonto) can hold none by definition.
 * `units` (Karton/Regal-Verwahrer) stays a direct Meeple reference.
 */
export async function countOpenHoldings(
  meepleId: string,
): Promise<OpenHoldingsSummary> {
  const [member, units] = await Promise.all([
    prisma.member.findUnique({ where: { meepleId }, select: { id: true } }),
    prisma.storageUnit.count({
      where: { keeperMeepleId: meepleId, retiredAt: null },
    }),
  ]);

  const games = member
    ? await prisma.gameHolding.count({
        where: { vereinsmitgliedId: member.id, endedAt: null },
      })
    : 0;

  return { games, units };
}

export function hasOpenHoldings({ games, units }: OpenHoldingsSummary) {
  return games > 0 || units > 0;
}

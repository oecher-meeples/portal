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

/**
 * Wie `countOpenHoldings`, aber direkt über die `Member`-Id — für Stufe 3 der
 * Anonymisierung (#331): Stufe 2 hat `Member.meepleId` da schon getrennt, ein
 * `Meeple`-Lookup findet das Vereinsmitglied dann nicht mehr. `units`
 * (Karton-/Regal-Verwahrer) bleibt ein direkter Meeple-Bezug und ist in
 * Stufe 3 irrelevant — das Login existiert zu dem Zeitpunkt nicht mehr.
 */
export async function countOpenHoldingsByMemberId(
  memberId: string,
): Promise<number> {
  return prisma.gameHolding.count({
    where: { vereinsmitgliedId: memberId, endedAt: null },
  });
}

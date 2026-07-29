import { prisma } from "@/lib/prisma";
import { GameInventoryStatus } from "@prisma/client";
import { isLoanHolding, zustandFromHoldingAndUnit } from "@/lib/ludothek/holdings";
import type { LudothekGame } from "@/lib/ludothek/browser";

const MAX_UNIT_CHAIN_DEPTH = 20;

/**
 * Everything the Ludothek browser and detail page need, in one bulk query —
 * avoids an N+1 per game for zustand/location/responsibility.
 */
export async function buildLudothekGames(): Promise<LudothekGame[]> {
  const [games, units] = await Promise.all([
    prisma.boardGame.findMany({
      where: { status: { not: GameInventoryStatus.DEINVENTARISED } },
      orderBy: { title: "asc" },
      include: {
        holdings: {
          where: { endedAt: null },
          include: { unit: true, meeple: { select: { displayName: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      select: { id: true, label: true, parentUnitId: true, keeperMeepleId: true },
    }),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));

  function resolveUnitChain(unitId: string) {
    const chain: string[] = [];
    let keeperMeepleId: string | null = null;
    let currentId: string | null = unitId;
    let depth = 0;

    while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
      const unit = unitById.get(currentId);
      if (!unit) break;
      chain.push(unit.label);
      if (unit.keeperMeepleId) {
        keeperMeepleId = unit.keeperMeepleId;
        break;
      }
      currentId = unit.parentUnitId;
      depth += 1;
    }

    return { chain: chain.reverse().join(" → "), keeperMeepleId };
  }

  return games.map((game) => {
    const holding = game.holdings[0] ?? null;
    const base = {
      id: game.id,
      slug: game.slug,
      title: game.title,
      imageUrl: game.imageUrl,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      playTimeMinutes: game.playTimeMinutes,
      weight: game.weight,
      mechanics: game.mechanics,
    };

    if (!holding) {
      return {
        ...base,
        zustand: "nicht-erfasst" as const,
        isLoanedOut: false,
        responsibleMeepleId: null,
        locationChain: "",
      };
    }

    if (holding.meepleId) {
      return {
        ...base,
        zustand: zustandFromHoldingAndUnit(holding, null, game.status),
        isLoanedOut: isLoanHolding(holding),
        responsibleMeepleId: holding.meepleId,
        locationChain: `bei ${holding.meeple?.displayName ?? "Meeple"}`,
      };
    }

    const { chain, keeperMeepleId } = resolveUnitChain(holding.unitId!);
    return {
      ...base,
      zustand: zustandFromHoldingAndUnit(holding, holding.unit, game.status),
      isLoanedOut: false,
      responsibleMeepleId: keeperMeepleId,
      locationChain: chain,
    };
  });
}

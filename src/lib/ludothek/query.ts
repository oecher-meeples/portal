import { prisma } from "@/lib/utils/prisma";
import { GameInventoryStatus } from "@prisma/client";
import {
  isLoanHolding,
  zustandFromHoldingAndUnit,
} from "@/lib/ludothek/holdings";
import type { LudothekGame } from "@/lib/ludothek/browser";

const MAX_UNIT_CHAIN_DEPTH = 20;

/**
 * Everything the Ludothek browser and detail page need, in one bulk query —
 * avoids an N+1 per copy for zustand/location/responsibility. One row per
 * physical copy; title-level fields (description, mechanics, …) come from
 * the shared `BoardGame`.
 */
export async function buildLudothekGames(): Promise<LudothekGame[]> {
  const [copies, units] = await Promise.all([
    prisma.gameCopy.findMany({
      where: { status: { not: GameInventoryStatus.DEINVENTARISED } },
      orderBy: { boardGame: { title: "asc" } },
      include: {
        boardGame: {
          include: {
            baseGameCollections: {
              include: { expansion: { select: { id: true, title: true } } },
            },
            expansionCollections: {
              include: { baseGame: { select: { id: true, title: true } } },
            },
          },
        },
        holdings: {
          where: { endedAt: null },
          include: { unit: true, meeple: { select: { displayName: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      select: {
        id: true,
        label: true,
        parentUnitId: true,
        keeperMeepleId: true,
      },
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

  return copies.map((copy) => {
    const boardGame = copy.boardGame;
    const holding = copy.holdings[0] ?? null;
    const base = {
      id: copy.id,
      slug: copy.slug,
      title: boardGame.title,
      imageUrl: boardGame.imageUrl,
      minPlayers: boardGame.minPlayers,
      maxPlayers: boardGame.maxPlayers,
      playTimeMinutes: boardGame.playTimeMinutes,
      weight: boardGame.weight,
      mechanics: boardGame.mechanics,
      ean: boardGame.ean,
      condition: copy.condition,
      bggId: boardGame.bggId,
      description: boardGame.description,
      explainerVideoUrl: boardGame.explainerVideoUrl,
      kind: boardGame.kind,
      baseGames: boardGame.expansionCollections.map((c) => c.baseGame),
      expansions: boardGame.baseGameCollections.map((c) => c.expansion),
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
        zustand: zustandFromHoldingAndUnit(holding, null, copy.status),
        isLoanedOut: isLoanHolding(holding),
        responsibleMeepleId: holding.meepleId,
        locationChain: `bei ${holding.meeple?.displayName ?? "Meeple"}`,
      };
    }

    const { chain, keeperMeepleId } = resolveUnitChain(holding.unitId!);
    return {
      ...base,
      zustand: zustandFromHoldingAndUnit(holding, holding.unit, copy.status),
      isLoanedOut: false,
      responsibleMeepleId: keeperMeepleId,
      locationChain: chain,
    };
  });
}

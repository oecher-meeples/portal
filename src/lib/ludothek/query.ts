import { prisma } from "@/lib/utils/prisma";
import { BoardGameKind, GameInventoryStatus } from "@prisma/client";
import {
  isLoanHolding,
  zustandFromHoldingAndUnit,
} from "@/lib/ludothek/holdings";
import {
  formatLocationChain,
  walkUnitChain,
} from "@/lib/ludothek/holdings-lookup";
import { getExplainerCountsForGames } from "@/lib/explainer/queries";
import type { LudothekGame } from "@/lib/ludothek/browser";

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
              include: {
                expansion: {
                  select: { id: true, title: true, slug: true, imageUrl: true },
                },
              },
            },
            expansionCollections: {
              include: {
                baseGame: {
                  select: { id: true, title: true, slug: true, imageUrl: true },
                },
              },
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

  const explainerCounts = await getExplainerCountsForGames([
    ...new Set(copies.map((c) => c.boardGame.id)),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const keeperIds = [
    ...new Set(
      units
        .map((u) => u.keeperMeepleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const keepers = keeperIds.length
    ? await prisma.meeple.findMany({
        where: { id: { in: keeperIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const keeperNameById = new Map(keepers.map((k) => [k.id, k.displayName]));

  return copies.map((copy) => {
    const boardGame = copy.boardGame;
    const holding = copy.holdings[0] ?? null;
    const base = {
      id: copy.id,
      boardGameId: boardGame.id,
      slug: copy.slug,
      boardGameSlug: boardGame.slug,
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
      explainerCount: explainerCounts.get(boardGame.id) ?? 0,
    };

    if (!holding) {
      return {
        ...base,
        zustand: "nicht-erfasst" as const,
        isLoanedOut: false,
        responsibleMeepleId: null,
        responsibleName: null,
        unitChain: "",
        locationChain: "",
      };
    }

    if (holding.meepleId) {
      const responsibleName = holding.meeple?.displayName ?? "Meeple";
      return {
        ...base,
        zustand: zustandFromHoldingAndUnit(holding, null, copy.status),
        isLoanedOut: isLoanHolding(holding),
        responsibleMeepleId: holding.meepleId,
        responsibleName,
        unitChain: "",
        locationChain: formatLocationChain({ responsibleName, unitChain: "" }),
      };
    }

    const { unitChain, keeperMeepleId } = walkUnitChain(
      holding.unitId!,
      unitById,
    );
    const responsibleName = keeperMeepleId
      ? (keeperNameById.get(keeperMeepleId) ?? null)
      : null;
    return {
      ...base,
      zustand: zustandFromHoldingAndUnit(holding, holding.unit, copy.status),
      isLoanedOut: false,
      responsibleMeepleId: keeperMeepleId,
      responsibleName,
      unitChain,
      locationChain: formatLocationChain({ responsibleName, unitChain }),
    };
  });
}

/** Live count of base-game titles, for the homepage subtitle (#97). */
export async function countBoardGameTitles(): Promise<number> {
  return prisma.boardGame.count({
    where: { kind: BoardGameKind.BOARDGAME },
  });
}

/** Rounds down to the nearest hundred so the subtitle never overstates the inventory. */
export function roundDownToHundred(count: number): number {
  return Math.floor(count / 100) * 100;
}

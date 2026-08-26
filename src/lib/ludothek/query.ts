import { prisma } from "@/lib/utils/prisma";
import { BoardGameKind, GameInventoryStatus } from "@prisma/client";
import {
  isLoanHolding,
  zustandFromHoldingAndUnit,
} from "@/lib/ludothek/holdings";
import {
  buildUnitAndKeeperMaps,
  formatLocationChain,
  walkUnitChain,
} from "@/lib/ludothek/holdings-lookup";
import { getExplainerCountsForGames } from "@/lib/explainer/queries";
import { getBoardGameIdsWithOpenLfgPosts } from "@/lib/content/lfg";
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
      // Default sort: highest-rated first, titles without a rating last (#214).
      orderBy: [
        { boardGame: { averageRating: { sort: "desc", nulls: "last" } } },
        { boardGame: { title: "asc" } },
      ],
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
            alternateNames: { select: { name: true } },
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

  const uniqueBoardGameIds = [...new Set(copies.map((c) => c.boardGame.id))];
  const [explainerCounts, boardGameIdsWithOpenLfg] = await Promise.all([
    getExplainerCountsForGames(uniqueBoardGameIds),
    getBoardGameIdsWithOpenLfgPosts(uniqueBoardGameIds),
  ]);

  const { unitById, keeperNameById } = await buildUnitAndKeeperMaps(units);

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
      averageRating: boardGame.averageRating,
      mechanics: boardGame.mechanics,
      ean: boardGame.ean,
      condition: copy.condition,
      ruleBookLanguages: copy.ruleBookLanguages,
      bggId: boardGame.bggId,
      alternateNames: boardGame.alternateNames.map((a) => a.name),
      secondaryTitle: boardGame.secondaryTitle,
      description: boardGame.description,
      explainerVideoUrl: boardGame.explainerVideoUrl,
      kind: boardGame.kind,
      languageDependence: boardGame.languageDependence,
      publisher: boardGame.publisher,
      author: boardGame.author,
      yearPublished: boardGame.yearPublished,
      baseGames: boardGame.expansionCollections.map((c) => c.baseGame),
      expansions: boardGame.baseGameCollections.map((c) => c.expansion),
      explainerCount: explainerCounts.get(boardGame.id) ?? 0,
      hasOpenLfg: boardGameIdsWithOpenLfg.has(boardGame.id),
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

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  type BoardGameSearchHit,
  groupExpansionsUnderBase,
  type ExplainerGameFilter,
  type ExplainerGameRow,
} from "@/lib/explainer/game-list";

function whereForFilter(
  meepleId: string,
  filter: ExplainerGameFilter,
): Prisma.BoardGameWhereInput {
  const mine = { privateCollectionEntries: { some: { meepleId } } };
  const wanted = { explainerWanted: true };
  const known = { explainerGames: { some: { meepleId } } };
  if (filter === "mine") return mine;
  if (filter === "wanted") return wanted;
  if (filter === "known") return known;
  return { OR: [mine, wanted, known] };
}

const ROW_SELECT = (meepleId: string) =>
  ({
    id: true,
    title: true,
    imageUrl: true,
    slug: true,
    secondaryTitle: true,
    kind: true,
    explainerWanted: true,
    expansionCollections: { select: { baseGameId: true } },
    explainerGames: { where: { meepleId }, select: { level: true } },
  }) satisfies Prisma.BoardGameSelect;

type RowSource = Prisma.BoardGameGetPayload<{
  select: ReturnType<typeof ROW_SELECT>;
}>;

function toRow(game: RowSource) {
  const row: ExplainerGameRow = {
    boardGameId: game.id,
    boardGameTitle: game.title,
    imageUrl: game.imageUrl,
    slug: game.slug,
    secondaryTitle: game.secondaryTitle,
    isExpansion: game.kind === "BOARDGAME_EXPANSION",
    wanted: game.explainerWanted,
    level: game.explainerGames[0]?.level ?? null,
  };
  return { row, baseIds: game.expansionCollections.map((c) => c.baseGameId) };
}

/**
 * Spieleliste für Tab „Meine Spiele“ (#663). `mine` = eigene BGG-Spiele (auch
 * ohne Niveau), `wanted` = Flag „Erklärer gesucht“ (auch ohne Niveau),
 * `known` = Spiele mit eigenem Niveau. Erweiterungen unter ihrem Basisspiel.
 */
export async function getMyExplainerGames(
  meepleId: string,
  filter: ExplainerGameFilter,
): Promise<ExplainerGameRow[]> {
  const games = await prisma.boardGame.findMany({
    where: whereForFilter(meepleId, filter),
    orderBy: { title: "asc" },
    select: ROW_SELECT(meepleId),
  });
  return groupExpansionsUnderBase(games.map(toRow));
}

/** Serverseitige Suche über Titel und Zweittitel **aller** Spiele — kein
 * Vorladen aller Titel. */
export async function searchBoardGames(
  query: string,
  limit = 10,
  excludeIds: string[] = [],
): Promise<BoardGameSearchHit[]> {
  const term = query.trim();
  if (!term) return [];
  return prisma.boardGame.findMany({
    where: {
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { secondaryTitle: { contains: term, mode: "insensitive" } },
      ],
      ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
    },
    orderBy: { title: "asc" },
    take: limit,
    select: { id: true, title: true, secondaryTitle: true, imageUrl: true },
  });
}

/** Gesuchte Spiele, zu denen ich noch kein Niveau eingetragen habe
 * (Dashboard-Card, #666). */
export async function countWantedGamesWithoutMyLevel(
  meepleId: string,
): Promise<number> {
  return prisma.boardGame.count({
    where: {
      explainerWanted: true,
      explainerGames: { none: { meepleId } },
    },
  });
}

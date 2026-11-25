import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  groupExpansionsUnderBase,
  type ExplainerGameRow,
} from "@/lib/explainer/game-list";

/** Exklusive Filter von Tab 1 (#663): `relevant` = Vereinigung der übrigen. */
export const EXPLAINER_GAME_FILTERS = [
  "relevant",
  "mine",
  "wanted",
  "known",
] as const;
export type ExplainerGameFilter = (typeof EXPLAINER_GAME_FILTERS)[number];

export const EXPLAINER_GAME_FILTER_LABELS: Record<ExplainerGameFilter, string> =
  {
    relevant: "Relevante",
    mine: "Meine",
    wanted: "Gesucht",
    known: "Bekannte",
  };

export function parseExplainerGameFilter(
  value: string | undefined,
): ExplainerGameFilter {
  return EXPLAINER_GAME_FILTERS.find((f) => f === value) ?? "relevant";
}

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
    bggId: true,
    kind: true,
    explainerWanted: true,
    expansionCollections: { select: { baseGameId: true } },
    explainerGames: { where: { meepleId }, select: { level: true } },
  }) satisfies Prisma.BoardGameSelect;

type RowSource = Prisma.BoardGameGetPayload<{
  select: ReturnType<typeof ROW_SELECT>;
}>;

function toRow(game: RowSource) {
  return {
    boardGameId: game.id,
    boardGameTitle: game.title,
    imageUrl: game.imageUrl,
    bggId: game.bggId,
    isExpansion: game.kind === "BOARDGAME_EXPANSION",
    wanted: game.explainerWanted,
    level: game.explainerGames[0]?.level ?? null,
    baseIds: game.expansionCollections.map((c) => c.baseGameId),
  };
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

/** Eine Zeile für ein einzelnes Spiel, z. B. nach dem Hinzufügen per Suche. */
export type BoardGameSearchHit = {
  id: string;
  title: string;
};

/** Serverseitige Titelsuche über **alle** Spiele — kein Vorladen aller Titel. */
export async function searchBoardGames(
  query: string,
  limit = 10,
  excludeIds: string[] = [],
): Promise<BoardGameSearchHit[]> {
  const term = query.trim();
  if (!term) return [];
  return prisma.boardGame.findMany({
    where: {
      title: { contains: term, mode: "insensitive" },
      ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
    },
    orderBy: { title: "asc" },
    take: limit,
    select: { id: true, title: true },
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

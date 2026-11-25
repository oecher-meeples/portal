import { prisma } from "@/lib/utils/prisma";
import type { ExplainerEntry } from "@/lib/explainer/queries";

export type ExplainerDirectoryFilter = "all" | "wanted";

export const EXPLAINER_DIRECTORY_FILTER_LABELS: Record<
  ExplainerDirectoryFilter,
  string
> = { all: "Alle", wanted: "Gesucht" };

/** URL-Werte (`?filter=gesucht`) je Filter. */
export const EXPLAINER_DIRECTORY_FILTER_SLUGS: Record<
  ExplainerDirectoryFilter,
  string
> = { all: "alle", wanted: "gesucht" };

export function parseDirectoryFilter(
  value: string | undefined,
): ExplainerDirectoryFilter {
  return value === EXPLAINER_DIRECTORY_FILTER_SLUGS.wanted ? "wanted" : "all";
}

export type ExplainerDirectoryEntry = {
  boardGameId: string;
  boardGameTitle: string;
  imageUrl: string | null;
  bggId: number | null;
  wanted: boolean;
  explainers: ExplainerEntry[];
};

/**
 * Erklärbär-Verzeichnis (Tab 2, #664/#662): `all` = Spiele mit mind. einem
 * Erklärer, `wanted` = Spiele mit Flag „Erklärer gesucht“, auch ohne
 * Erklärer. Alphabetisch, optional per Titel gefiltert. Nur für
 * `events:manage` aufrufen — die Berechtigung prüft der Aufrufer.
 */
export async function getExplainerDirectory({
  filter,
  query,
}: {
  filter: ExplainerDirectoryFilter;
  query?: string;
}): Promise<ExplainerDirectoryEntry[]> {
  const term = query?.trim();
  const games = await prisma.boardGame.findMany({
    where: {
      ...(filter === "wanted"
        ? { explainerWanted: true }
        : { explainerGames: { some: {} } }),
      ...(term && { title: { contains: term, mode: "insensitive" } }),
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      bggId: true,
      explainerWanted: true,
      explainerGames: {
        orderBy: { meeple: { displayName: "asc" } },
        select: {
          level: true,
          meeple: {
            select: {
              id: true,
              displayName: true,
              profilePictureUrl: true,
              profilePictureVisibility: true,
            },
          },
        },
      },
    },
  });

  return games.map((game) => ({
    boardGameId: game.id,
    boardGameTitle: game.title,
    imageUrl: game.imageUrl,
    bggId: game.bggId,
    wanted: game.explainerWanted,
    explainers: game.explainerGames.map((entry) => ({
      meepleId: entry.meeple.id,
      displayName: entry.meeple.displayName,
      level: entry.level,
      profilePictureUrl: entry.meeple.profilePictureUrl,
      profilePictureVisibility: entry.meeple.profilePictureVisibility,
    })),
  }));
}

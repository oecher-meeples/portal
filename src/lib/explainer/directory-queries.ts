import { prisma } from "@/lib/utils/prisma";
import type {
  ExplainerDirectoryEntry,
  ExplainerDirectoryFilter,
} from "@/lib/explainer/game-list";

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
      slug: true,
      secondaryTitle: true,
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
    slug: game.slug,
    secondaryTitle: game.secondaryTitle,
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

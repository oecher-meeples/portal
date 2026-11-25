import type {
  ExplainerExperienceLevel,
  ProfilePictureVisibility,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type ExplainerEntry = {
  meepleId: string;
  displayName: string;
  level: ExplainerExperienceLevel;
  /** (#412) Profilbild — beide Konsumenten (Ludothek-Detailseite,
   * Admin-Verzeichnis) sind member-only, Viewer daher immer "meeple". */
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
};

/** Erklärbären for one Spiel, sorted by name — used on the Ludothek detail page. */
export async function getExplainersForGame(
  boardGameId: string,
): Promise<ExplainerEntry[]> {
  const entries = await prisma.explainerGame.findMany({
    where: { boardGameId },
    orderBy: { meeple: { displayName: "asc" } },
    include: {
      meeple: {
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          profilePictureVisibility: true,
        },
      },
    },
  });

  return entries.map((entry) => ({
    meepleId: entry.meeple.id,
    displayName: entry.meeple.displayName,
    level: entry.level,
    profilePictureUrl: entry.meeple.profilePictureUrl,
    profilePictureVisibility: entry.meeple.profilePictureVisibility,
  }));
}

/** Erklärbären count per title, batched for the Ludothek list view (#143) —
 * a plain count instead of `getExplainersForGame`'s full entries, since the
 * list-row overlay only shows a number, not names/levels. Titles with no
 * Erklärbär are simply absent from the returned map. */
export async function getExplainerCountsForGames(
  boardGameIds: string[],
): Promise<Map<string, number>> {
  if (boardGameIds.length === 0) return new Map();

  const grouped = await prisma.explainerGame.groupBy({
    by: ["boardGameId"],
    where: { boardGameId: { in: boardGameIds } },
    _count: { _all: true },
  });

  return new Map(grouped.map((g) => [g.boardGameId, g._count._all]));
}

/**
 * BoardGame-Ids, für die gerade (während `eventId`) mind. ein anwesender
 * Erklärbär registriert ist — Gast-während-Event-Kontext des "Erklärbär
 * vorhanden"-Filters (#256). Bewusst kein Zeit-Scheduling: `ExplainerAttendance`
 * ist ein reiner "heute anwesend"-Boolean pro Event (CONTEXT.md).
 */
export async function getAttendingExplainerBoardGameIds(
  eventId: string,
): Promise<Set<string>> {
  const attendances = await prisma.explainerAttendance.findMany({
    where: { eventId },
    select: { meepleId: true },
  });
  if (attendances.length === 0) return new Set();

  const games = await prisma.explainerGame.findMany({
    where: { meepleId: { in: attendances.map((a) => a.meepleId) } },
    select: { boardGameId: true },
  });

  return new Set(games.map((g) => g.boardGameId));
}

export type OwnPrivateGameExplainerEntry = {
  boardGameId: string;
  boardGameTitle: string;
  /** Erweiterung — steht in der Liste direkt unter ihrem Basisspiel. */
  isExpansion: boolean;
  /** `null`, solange das Spiel nicht als Erklärbär-Eintrag geführt wird. */
  level: ExplainerExperienceLevel | null;
};

/**
 * Die eigenen importierten BGG-Spiele (`PrivateGameCollectionEntry`) mit dem
 * jeweils bereits gesetzten Erklärbär-Niveau — Grundlage des Akkordeons auf
 * `/erklaerbaeren`, damit man eigene Spiele nicht einzeln suchen muss.
 */
export async function getOwnPrivateGamesWithExplainerLevel(
  meepleId: string,
): Promise<OwnPrivateGameExplainerEntry[]> {
  const [entries, explained] = await Promise.all([
    prisma.privateGameCollectionEntry.findMany({
      where: { meepleId },
      orderBy: { boardGame: { title: "asc" } },
      select: {
        boardGame: {
          select: {
            id: true,
            title: true,
            kind: true,
            expansionCollections: { select: { baseGameId: true } },
          },
        },
      },
    }),
    prisma.explainerGame.findMany({
      where: { meepleId },
      select: { boardGameId: true, level: true },
    }),
  ]);
  const levels = new Map(explained.map((e) => [e.boardGameId, e.level]));

  const games = entries.map(({ boardGame }) => ({
    boardGameId: boardGame.id,
    boardGameTitle: boardGame.title,
    isExpansion: boardGame.kind === "BOARDGAME_EXPANSION",
    level: levels.get(boardGame.id) ?? null,
    baseIds: boardGame.expansionCollections.map((c) => c.baseGameId),
  }));
  return groupExpansionsUnderBase(games);
}

/** Basisspiele alphabetisch (Eingabereihenfolge), jede Erweiterung direkt
 * unter ihrem Basisspiel. Erweiterungen ohne Basisspiel in der Liste bleiben
 * an ihrer alphabetischen Stelle. */
function groupExpansionsUnderBase(
  games: (OwnPrivateGameExplainerEntry & { baseIds: string[] })[],
): OwnPrivateGameExplainerEntry[] {
  const ids = new Set(games.map((g) => g.boardGameId));
  const attached = (g: { isExpansion: boolean; baseIds: string[] }) =>
    g.isExpansion && g.baseIds.some((id) => ids.has(id));
  const strip = (game: (typeof games)[number]) => {
    const rest: Partial<(typeof games)[number]> = { ...game };
    delete rest.baseIds;
    return rest as OwnPrivateGameExplainerEntry;
  };

  return games
    .filter((g) => !attached(g))
    .flatMap((g) => [
      strip(g),
      ...games
        .filter((e) => attached(e) && e.baseIds.includes(g.boardGameId))
        .map(strip),
    ]);
}

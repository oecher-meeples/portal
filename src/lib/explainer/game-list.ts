import type { ExplainerExperienceLevel } from "@prisma/client";
import type { ExplainerEntry } from "@/lib/explainer/queries";

// Prisma-freie Typen, Filter-Konstanten und Hilfen der Erklärbären-Seite —
// auch aus Client-Komponenten importierbar (die *-queries.ts laden Prisma).

/** Eine Zeile der Erklärbär-Spieleliste (Tab „Meine Spiele“, #663). */
export type ExplainerGameRow = {
  boardGameId: string;
  boardGameTitle: string;
  imageUrl: string | null;
  /** Für den Link zur Spieldetailseite `/ludothek/[slug]`. */
  slug: string;
  /** Erweiterung — steht direkt unter ihrem Basisspiel. */
  isExpansion: boolean;
  /** „Erklärer gesucht“ (#660). */
  wanted: boolean;
  /** `null`, solange ich kein Niveau für das Spiel eingetragen habe. */
  level: ExplainerExperienceLevel | null;
};

/**
 * Basisspiele in Eingabereihenfolge, jede Erweiterung direkt unter ihrem
 * (ersten in der Liste vorhandenen) Basisspiel — nie doppelt. Erweiterungen
 * ohne Basisspiel in der Liste bleiben an ihrer alphabetischen Stelle.
 */
export function groupExpansionsUnderBase<
  T extends { boardGameId: string; isExpansion: boolean },
>(games: { row: T; baseIds: string[] }[]): T[] {
  const ids = new Set(games.map((g) => g.row.boardGameId));
  const baseOf = (g: { row: T; baseIds: string[] }) =>
    g.row.isExpansion ? g.baseIds.find((id) => ids.has(id)) : undefined;

  return games
    .filter((g) => baseOf(g) === undefined)
    .flatMap((g) => [
      g.row,
      ...games.filter((e) => baseOf(e) === g.row.boardGameId).map((e) => e.row),
    ]);
}

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

/** URL-Werte (`?filter=gesucht`, #666) je Filter. */
export const EXPLAINER_GAME_FILTER_SLUGS: Record<ExplainerGameFilter, string> =
  {
    relevant: "relevante",
    mine: "meine",
    wanted: "gesucht",
    known: "bekannte",
  };

export function parseExplainerGameFilter(
  value: string | undefined,
): ExplainerGameFilter {
  return (
    EXPLAINER_GAME_FILTERS.find(
      (f) => EXPLAINER_GAME_FILTER_SLUGS[f] === value,
    ) ?? "relevant"
  );
}

/** Treffer der serverseitigen Titelsuche. */
export type BoardGameSearchHit = {
  id: string;
  title: string;
};

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
  /** Für den Link zur Spieldetailseite `/ludothek/[slug]`. */
  slug: string;
  wanted: boolean;
  explainers: ExplainerEntry[];
};

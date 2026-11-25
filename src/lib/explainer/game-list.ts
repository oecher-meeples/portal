import type { ExplainerExperienceLevel } from "@prisma/client";

/** Eine Zeile der Erklärbär-Spieleliste (Tab „Meine Spiele“, #663). */
export type ExplainerGameRow = {
  boardGameId: string;
  boardGameTitle: string;
  imageUrl: string | null;
  bggId: number | null;
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

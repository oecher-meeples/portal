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
>(games: (T & { baseIds: string[] })[]): T[] {
  const ids = new Set(games.map((g) => g.boardGameId));
  const baseOf = (g: { isExpansion: boolean; baseIds: string[] }) =>
    g.isExpansion ? g.baseIds.find((id) => ids.has(id)) : undefined;
  const strip = ({ baseIds: _baseIds, ...rest }: T & { baseIds: string[] }) =>
    rest as unknown as T;

  return games
    .filter((g) => baseOf(g) === undefined)
    .flatMap((g) => [
      strip(g),
      ...games.filter((e) => baseOf(e) === g.boardGameId).map(strip),
    ]);
}

/** Anonymised counts for the "Spieletitel"/"Exemplare"-Cards on the
 * Statistiken-Seite (#284) — `club`/`private` per source, `total` combines
 * them. */
export type InventoryCounts = {
  club: number;
  private: number;
  total: number;
};

/**
 * Card "Spieletitel": distinct Titelanzahl je Quelle. `total` ist die
 * Vereinigungsmenge — ein Titel, der sowohl im Verein als auch privat
 * vorhanden ist, zählt dort nur einmal (kein Doppelzählen).
 */
export function countBoardGameTitles(
  clubBoardGameIds: string[],
  privateBoardGameIds: string[],
): InventoryCounts {
  const club = new Set(clubBoardGameIds);
  const privateSet = new Set(privateBoardGameIds);
  const total = new Set([...club, ...privateSet]);
  return { club: club.size, private: privateSet.size, total: total.size };
}

/**
 * Card "Exemplare": physische Einheiten je Quelle. `total` ist die Summe —
 * anders als bei Titeln gibt es hier keine Überschneidung, jedes Exemplar
 * ist genau einer Quelle zugeordnet.
 */
export function countGameCopies(
  clubCopyCount: number,
  privateCopyCount: number,
): InventoryCounts {
  return {
    club: clubCopyCount,
    private: privateCopyCount,
    total: clubCopyCount + privateCopyCount,
  };
}

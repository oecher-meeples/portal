import type { Prisma } from "@prisma/client";

/**
 * Ein Katalog-Stub ist ein Titel, der nur aus einem Want-to-Play-Import (#637)
 * oder einem fehlgeschlagenen Einzelabruf stammt: Titel, Bild, Jahr und
 * Bewertung, aber weder Beschreibung noch Spielerzahl. Das Bild zählt bewusst
 * nicht. Vollständige Daten kommen erst bei Besitz (Person oder Verein);
 * `findOrCreateBoardGameTitle()` wertet einen Stub dann auf.
 */
export function isCatalogStub(boardGame: {
  description?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
}) {
  return (
    !boardGame.description &&
    boardGame.minPlayers == null &&
    boardGame.maxPlayers == null
  );
}

/** Prisma-Gegenstück zu `!isCatalogStub()`: nur Titel mit echten Katalogdaten. */
export const NOT_CATALOG_STUB_WHERE: Prisma.BoardGameWhereInput = {
  OR: [
    { description: { not: null } },
    { minPlayers: { not: null } },
    { maxPlayers: { not: null } },
  ],
};

/** Titel, die zum Bestand gehören: mindestens ein Vereinsexemplar oder ein
 * Privatbesitz-Eintrag. Reine Want-to-Play-Stubs (#637) erfüllen das nicht und
 * gehören in keine Auswahl und keine Statistik des Vereinsbestands. */
export const IN_INVENTORY_WHERE: Prisma.BoardGameWhereInput = {
  OR: [{ copies: { some: {} } }, { privateCollectionEntries: { some: {} } }],
};

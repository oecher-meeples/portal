import { ShelfCategory } from "@prisma/client";

/** Deutsche Labels für die sechs Regal-Kategorien (#276). */
export const SHELF_CATEGORY_LABELS: Record<ShelfCategory, string> = {
  [ShelfCategory.ZWEI_PERSONEN]: "2-Personen-Spiele",
  [ShelfCategory.KINDER_FAMILIE]: "Kinder- & Familienspiele",
  [ShelfCategory.KENNERSPIELE]: "Kennerspiele",
  [ShelfCategory.EXPERTENSPIELE]: "Expertenspiele",
  [ShelfCategory.KOOPERATIV]: "Kooperative Spiele",
  [ShelfCategory.PARTY]: "Party- & Kommunikationsspiele",
};

/** Feste Reihenfolge für Dropdowns/Auflistungen. */
export const SHELF_CATEGORY_VALUES: ShelfCategory[] = [
  ShelfCategory.ZWEI_PERSONEN,
  ShelfCategory.KINDER_FAMILIE,
  ShelfCategory.KENNERSPIELE,
  ShelfCategory.EXPERTENSPIELE,
  ShelfCategory.KOOPERATIV,
  ShelfCategory.PARTY,
];

/** BGGs Mechanik-Bezeichnung für "kooperativ", bereits übersetzt (#184) — siehe
 * `mechanics-translations.ts`. */
const COOPERATIVE_MECHANIC = "Kooperativ";
const CHILDREN_OR_FAMILY_CATEGORIES = ["Children's Game", "Family Game"];
const PARTY_CATEGORY = "Party Game";
const KENNERSPIEL_MIN_WEIGHT = 2.0;
const EXPERTENSPIEL_MIN_WEIGHT = 3.0;
const PARTY_MIN_PLAYERS = 6;

/**
 * Reine, zustandslose Ableitung der Regal-Kategorien eines Spiels (#276) —
 * nichts davon wird gespeichert, `StorageUnit.category` ist eine separate,
 * vom Admin manuell vergebene Zuordnung des physischen Regals. Ein Spiel
 * kann mehrere Kategorien gleichzeitig treffen (z. B. kooperativ **und**
 * Expertenspiel) — fehlende Daten (kein `weight`/`mechanics`/`categories`)
 * lassen die jeweilige Regel einfach nicht greifen, kein Sonderfall nötig.
 */
export function deriveShelfCategories(game: {
  maxPlayers: number | null;
  weight: number | null;
  mechanics: string[];
  categories: string[];
}): ShelfCategory[] {
  const result: ShelfCategory[] = [];

  if (game.maxPlayers === 2) {
    result.push(ShelfCategory.ZWEI_PERSONEN);
  }

  if (
    (game.weight !== null && game.weight <= KENNERSPIEL_MIN_WEIGHT) ||
    game.categories.some((c) => CHILDREN_OR_FAMILY_CATEGORIES.includes(c))
  ) {
    result.push(ShelfCategory.KINDER_FAMILIE);
  }

  if (
    game.weight !== null &&
    game.weight > KENNERSPIEL_MIN_WEIGHT &&
    game.weight <= EXPERTENSPIEL_MIN_WEIGHT
  ) {
    result.push(ShelfCategory.KENNERSPIELE);
  }

  if (game.weight !== null && game.weight > EXPERTENSPIEL_MIN_WEIGHT) {
    result.push(ShelfCategory.EXPERTENSPIELE);
  }

  if (game.mechanics.includes(COOPERATIVE_MECHANIC)) {
    result.push(ShelfCategory.KOOPERATIV);
  }

  if (
    game.categories.includes(PARTY_CATEGORY) ||
    (game.maxPlayers !== null && game.maxPlayers >= PARTY_MIN_PLAYERS)
  ) {
    result.push(ShelfCategory.PARTY);
  }

  return result;
}

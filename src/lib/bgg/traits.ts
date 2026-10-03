import { BoardGameTrait } from "@prisma/client";

interface BggFamilyLink {
  type?: string;
  id?: string;
}

/** Whitelist von BGG-`boardgamefamily`-IDs mit Verleih-Relevanz
 * (#487-Konzept) — hardcodiert, technisches Importdetail, nicht
 * admin-editierbar (nur die Anzeige der Traits ist das, siehe
 * `lib/ludothek/board-game-traits.ts`). */
const TRAIT_FAMILY_IDS: Record<number, BoardGameTrait> = {
  25404: BoardGameTrait.LEGACY,
  24281: BoardGameTrait.CAMPAIGN,
  72224: BoardGameTrait.LIMITED_REPLAYABILITY,
  5666: BoardGameTrait.SOLITAIRE_SUPPORTED,
  61977: BoardGameTrait.SOLITAIRE_SUPPORTED,
  41489: BoardGameTrait.DIGITAL_HYBRID,
};

/** Erkennt die fünf verleih-relevanten BGG-Family-Signale aus den
 * `boardgamefamily`-Links des Haupt-Items (#487-Konzept) — `Set` entfernt
 * Duplikate, falls z. B. beide Solitaire-Families gleichzeitig vorkommen. */
export function parseTraits(
  links: BggFamilyLink | BggFamilyLink[] | undefined,
): BoardGameTrait[] {
  const list =
    links === undefined ? [] : Array.isArray(links) ? links : [links];
  const traits = list
    .filter((link) => link.type === "boardgamefamily")
    .map((link) => (link.id === undefined ? null : Number(link.id)))
    .filter((id): id is number => id !== null && Number.isFinite(id))
    .map((id) => TRAIT_FAMILY_IDS[id])
    .filter((trait): trait is BoardGameTrait => trait !== undefined);

  return [...new Set(traits)];
}

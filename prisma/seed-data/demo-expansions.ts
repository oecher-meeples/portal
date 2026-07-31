/**
 * Base game ↔ expansion pairs for the already-seeded demo games (see #30).
 * `seed.ts` derives `kind` from this list (a title appearing as `expansion`
 * becomes `BOARDGAME_EXPANSION`) and creates the matching `GameCollection`
 * rows. Matched by title against `demo-games.ts` — keep titles in sync.
 */
export const DEMO_EXPANSIONS: { baseGame: string; expansion: string }[] = [
  { baseGame: "Catan", expansion: "Catan: Cities & Knights" },
  { baseGame: "Catan", expansion: "Catan: Seafarers" },
  { baseGame: "Wingspan", expansion: "Wingspan: Asia" },
  { baseGame: "Wingspan", expansion: "Wingspan: European Expansion" },
  { baseGame: "Carcassonne", expansion: "Carcassonne: Inns & Cathedrals" },
  { baseGame: "Carcassonne", expansion: "Carcassonne: The River" },
  { baseGame: "Dixit", expansion: "Dixit Odyssey" },
  { baseGame: "Root", expansion: "Root: The Underworld Expansion" },
];

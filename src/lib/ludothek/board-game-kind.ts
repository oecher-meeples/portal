import { BoardGameKind } from "@prisma/client";

/** Anzeigename je `BoardGameKind` — die einzige Definition (Formular-Auswahl,
 * BGG-Abgleich). */
export const BOARD_GAME_KIND_LABELS: Record<BoardGameKind, string> = {
  [BoardGameKind.BOARDGAME]: "Basisspiel",
  [BoardGameKind.BOARDGAME_EXPANSION]: "Erweiterung",
};

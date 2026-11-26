import type { BoardGame } from "@prisma/client";
import {
  CONTRIBUTOR_LINKS_INCLUDE,
  contributorNamesByRole,
  type ContributorLinkRow,
} from "@/lib/ludothek/taxonomy/contributors-read";
import {
  TAG_LINKS_INCLUDE,
  tagLabelsByType,
  type TagLinkRow,
} from "@/lib/ludothek/taxonomy/tags-read";

/**
 * Prisma-`include` für einen Titel, wie ihn jeder Anzeige-Lesepfad braucht
 * (Ludothek-Browser, Privatsammlung, Admin-Bestand) — eine Stelle, damit ein
 * neues Titel-Feld (#490: Tags) nicht dreimal nachgezogen werden muss.
 * Wer mehr braucht (Erweiterungs-Verknüpfungen), spreizt `include` weiter.
 */
export const BOARD_GAME_DISPLAY_SELECT = {
  include: {
    alternateNames: { select: { name: true } },
    contributors: CONTRIBUTOR_LINKS_INCLUDE,
    tags: TAG_LINKS_INCLUDE,
    eans: { select: { ean: true }, orderBy: { createdAt: "asc" } },
  },
} as const;

type DisplayBoardGame = BoardGame & {
  alternateNames: { name: string }[];
  contributors: ContributorLinkRow[];
  tags: TagLinkRow[];
  eans: { ean: string }[];
};

/** Die titelbezogenen Anzeige-Felder eines Exemplars/Privateintrags — der
 * gemeinsame Teil von `LudothekGame` und den Admin-Bestand-Zeilen. */
export function boardGameDisplayFields(boardGame: DisplayBoardGame) {
  return {
    boardGameId: boardGame.id,
    boardGameSlug: boardGame.slug,
    title: boardGame.title,
    secondaryTitle: boardGame.secondaryTitle,
    imageUrl: boardGame.imageUrl,
    minPlayers: boardGame.minPlayers,
    maxPlayers: boardGame.maxPlayers,
    playTimeMinutes: boardGame.playTimeMinutes,
    weight: boardGame.weight,
    averageRating: boardGame.averageRating,
    ...tagLabelsByType(boardGame.tags),
    eans: boardGame.eans.map((row) => row.ean),
    bggId: boardGame.bggId,
    alternateNames: boardGame.alternateNames.map((a) => a.name),
    description: boardGame.description,
    explainerVideoUrl: boardGame.explainerVideoUrl,
    kind: boardGame.kind,
    languageDependence: boardGame.languageDependence,
    ...contributorNamesByRole(boardGame.contributors),
    yearPublished: boardGame.yearPublished,
    traits: boardGame.traits,
    notes: boardGame.notes,
  };
}

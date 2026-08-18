import {
  BoardGameKind,
  type LanguageDependence,
  type RuleBookLanguage,
} from "@prisma/client";
import {
  parseBggId,
  parseMechanics,
  formatMechanics,
  parseCommaSeparatedList,
  formatCommaSeparatedList,
} from "@/lib/ludothek/bgg-id";
import type {
  BoardGameTitleInput,
  CreateBoardGameInput,
} from "@/lib/ludothek/board-games";

/** All manually editable BoardGame fields, as raw string form state — shared
 * by `EditBoardGameTitle` and `EditBoardGameExemplar` (see #121/#122). */
export type BoardGameFormValues = {
  title: string;
  secondaryTitle: string;
  ean: string;
  condition: string;
  kind: BoardGameKind;
  bggId: string;
  minPlayers: string;
  maxPlayers: string;
  playTimeMinutes: string;
  weight: string;
  imageUrl: string;
  description: string;
  mechanics: string;
  explainerVideoUrl: string;
  /** BGGs Language-Dependence-Poll-Level, `null` solange nicht erfasst (#188). */
  languageDependence: LanguageDependence | null;
  /** Regelheft-Sprache(n) dieses Exemplars, Mehrfachauswahl (#188). */
  ruleBookLanguages: RuleBookLanguage[];
  /** Verlag(e), kommagetrennt — mehrere bei Co-Publishern (#205). */
  publisher: string;
  /** Autor(en)/Designer, kommagetrennt (#205). */
  author: string;
  /** Erstveröffentlichungsjahr (#205). */
  yearPublished: string;
};

export const EMPTY_BOARD_GAME_FORM: BoardGameFormValues = {
  title: "",
  secondaryTitle: "",
  ean: "",
  condition: "",
  kind: BoardGameKind.BOARDGAME,
  bggId: "",
  minPlayers: "",
  maxPlayers: "",
  playTimeMinutes: "",
  weight: "",
  imageUrl: "",
  description: "",
  mechanics: "",
  explainerVideoUrl: "",
  languageDependence: null,
  ruleBookLanguages: [],
  publisher: "",
  author: "",
  yearPublished: "",
};

/** The subset of a BoardGame record needed to seed the edit form. */
export type BoardGameRecord = {
  title: string;
  secondaryTitle: string | null;
  ean: string | null;
  condition: string | null;
  kind: BoardGameKind;
  bggId: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  explainerVideoUrl: string | null;
  languageDependence: LanguageDependence | null;
  ruleBookLanguages: RuleBookLanguage[];
  publisher: string[];
  author: string[];
  yearPublished: number | null;
};

export function boardGameToFormValues(
  game: BoardGameRecord,
): BoardGameFormValues {
  return {
    title: game.title,
    secondaryTitle: game.secondaryTitle ?? "",
    ean: game.ean ?? "",
    condition: game.condition ?? "",
    kind: game.kind,
    bggId: game.bggId?.toString() ?? "",
    minPlayers: game.minPlayers?.toString() ?? "",
    maxPlayers: game.maxPlayers?.toString() ?? "",
    playTimeMinutes: game.playTimeMinutes?.toString() ?? "",
    weight: game.weight?.toString() ?? "",
    imageUrl: game.imageUrl ?? "",
    description: game.description ?? "",
    mechanics: formatMechanics(game.mechanics),
    explainerVideoUrl: game.explainerVideoUrl ?? "",
    languageDependence: game.languageDependence,
    ruleBookLanguages: game.ruleBookLanguages,
    publisher: formatCommaSeparatedList(game.publisher),
    author: formatCommaSeparatedList(game.author),
    yearPublished: game.yearPublished?.toString() ?? "",
  };
}

/** Title-level fields only — for `updateBoardGame`, which never touches `condition`. */
export function boardGameFormToTitleInput(
  form: BoardGameFormValues,
): BoardGameTitleInput {
  return {
    title: form.title,
    secondaryTitle: form.secondaryTitle || undefined,
    ean: form.ean || undefined,
    kind: form.kind,
    bggId: form.bggId ? parseBggId(form.bggId) : undefined,
    minPlayers: form.minPlayers ? Number(form.minPlayers) : undefined,
    maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : undefined,
    playTimeMinutes: form.playTimeMinutes
      ? Number(form.playTimeMinutes)
      : undefined,
    weight: form.weight ? Number(form.weight) : undefined,
    imageUrl: form.imageUrl || undefined,
    description: form.description || undefined,
    mechanics: parseMechanics(form.mechanics),
    explainerVideoUrl: form.explainerVideoUrl || undefined,
    languageDependence: form.languageDependence,
    publisher: parseCommaSeparatedList(form.publisher),
    author: parseCommaSeparatedList(form.author),
    yearPublished: form.yearPublished ? Number(form.yearPublished) : undefined,
  };
}

/** Title fields plus `condition`/`ruleBookLanguages` — for `createBoardGame`,
 * which creates the first copy too. */
export function boardGameFormToInput(
  form: BoardGameFormValues,
): CreateBoardGameInput {
  return {
    ...boardGameFormToTitleInput(form),
    condition: form.condition || undefined,
    ruleBookLanguages: form.ruleBookLanguages,
  };
}

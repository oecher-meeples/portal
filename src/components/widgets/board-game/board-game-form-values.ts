import {
  BoardGameKind,
  type BoardGameTrait,
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
import type { BggLink } from "@/lib/bgg/client";
import type {
  EditionSelection,
  VersionInput,
} from "@/lib/ludothek/taxonomy/versions";

/** BGG-Metadaten der im Import gewählten Version — der Rest der Edition
 * (Verlage, Sprachen) steht editierbar in `BoardGameFormValues`. */
export type BggVersionMeta = {
  bggVersionId: number | null;
  name: string | null;
  yearPublished: number | null;
  productCode: string | null;
  publisherLinks: BggLink[];
};

/** `none` = keine Edition, `existing` = eine bereits am Titel vorhandene
 * (`editionVersionId`), `new` = Verlag/Sprache aus den Formularfeldern. */
export type EditionMode = "none" | "existing" | "new";

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
  /** BGGs Community-Durchschnittsbewertung, 0–10 (#214). */
  averageRating: string;
  imageUrl: string;
  description: string;
  mechanics: string;
  /** BGGs `boardgamecategory`-Links, kommagetrennt (#404) — kein eigenes
   * Formularfeld (nur BGG-Import/-Abgleich setzt sie), roundtrip-sicher wie
   * jedes andere Feld gegen versehentliches Leeren beim Speichern. */
  categories: string;
  explainerVideoUrl: string;
  /** BGGs Language-Dependence-Poll-Level, `null` solange nicht erfasst (#188). */
  languageDependence: LanguageDependence | null;
  /** Regelheft-Sprache(n) dieses Exemplars, Mehrfachauswahl (#188). */
  ruleBookLanguages: RuleBookLanguage[];
  /** Edition des Exemplars (BGG-Version) — Verlag(e), Sprache(n) und die
   * Wahl zwischen keiner/vorhandener/neuer Edition. */
  editionMode: EditionMode;
  editionVersionId: string;
  bggVersion: BggVersionMeta | null;
  /** Verlag(e) der Edition, kommagetrennt — mehrere bei Co-Publishern (#205). */
  publisher: string;
  /** Autor(en)/Designer, kommagetrennt (#205). */
  author: string;
  /** Illustrator(en), kommagetrennt (Epic #490). */
  illustrator: string;
  /** Erstveröffentlichungsjahr (#205). */
  yearPublished: string;
  /** BGG-Sprachnamen der Edition, kommagetrennt (z. B. `English`). */
  editionLanguages: string;
  /** BGGs Family-Signale mit Verleih-Auswirkung (#487-Konzept) — Mehrfach-
   * auswahl, Teil des BGG-Abgleichs (anders als `notes`). */
  traits: BoardGameTrait[];
  /** Freier Admin-Hinweis je Titel (#487-Konzept) — nie aus BGG befüllt, kein
   * Teil des BGG-Abgleichs. */
  notes: string;
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
  averageRating: "",
  imageUrl: "",
  description: "",
  mechanics: "",
  categories: "",
  explainerVideoUrl: "",
  languageDependence: null,
  ruleBookLanguages: [],
  editionMode: "none",
  editionVersionId: "",
  bggVersion: null,
  publisher: "",
  author: "",
  illustrator: "",
  yearPublished: "",
  editionLanguages: "",
  traits: [],
  notes: "",
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
  averageRating: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  categories: string[];
  explainerVideoUrl: string | null;
  languageDependence: LanguageDependence | null;
  ruleBookLanguages: RuleBookLanguage[];
  author: string[];
  illustrator: string[];
  yearPublished: number | null;
  traits: BoardGameTrait[];
  notes: string | null;
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
    averageRating: game.averageRating?.toString() ?? "",
    imageUrl: game.imageUrl ?? "",
    description: game.description ?? "",
    mechanics: formatMechanics(game.mechanics),
    categories: formatCommaSeparatedList(game.categories),
    explainerVideoUrl: game.explainerVideoUrl ?? "",
    languageDependence: game.languageDependence,
    ruleBookLanguages: game.ruleBookLanguages,
    editionMode: "none",
    editionVersionId: "",
    bggVersion: null,
    publisher: "",
    author: formatCommaSeparatedList(game.author),
    illustrator: formatCommaSeparatedList(game.illustrator),
    yearPublished: game.yearPublished?.toString() ?? "",
    editionLanguages: "",
    traits: game.traits,
    notes: game.notes ?? "",
  };
}

/** Verlage/Sprachen aus den Formularfeldern als Edition — `null`, wenn der
 * Modus nicht „neu" ist oder alles leer blieb. Verlage behalten die BGG-ID
 * der gewählten Version, sofern der Name noch dazu passt. */
export function formToVersionInput(
  form: BoardGameFormValues,
): VersionInput | null {
  if (form.editionMode !== "new") return null;
  const publishers = parseCommaSeparatedList(form.publisher);
  const languages = parseCommaSeparatedList(form.editionLanguages);
  if (publishers.length === 0 && languages.length === 0 && !form.bggVersion) {
    return null;
  }
  return {
    bggVersionId: form.bggVersion?.bggVersionId ?? null,
    name: form.bggVersion?.name ?? null,
    yearPublished: form.bggVersion?.yearPublished ?? null,
    productCode: form.bggVersion?.productCode ?? null,
    languages,
    publishers: publishers.map((name) => ({
      name,
      bggId:
        form.bggVersion?.publisherLinks.find((link) => link.name === name)
          ?.bggId ?? null,
    })),
  };
}

/** Formularfelder einer (z. B. aus BGG gewählten) Edition — `null` leert sie. */
export function versionInputToFormPatch(
  version: VersionInput | null,
): Partial<BoardGameFormValues> {
  if (!version) {
    return {
      editionMode: "none",
      editionVersionId: "",
      bggVersion: null,
      publisher: "",
      editionLanguages: "",
    };
  }
  return {
    editionMode: "new",
    editionVersionId: "",
    bggVersion: {
      bggVersionId: version.bggVersionId ?? null,
      name: version.name ?? null,
      yearPublished: version.yearPublished ?? null,
      productCode: version.productCode ?? null,
      publisherLinks: version.publishers.flatMap((p) =>
        p.bggId === null ? [] : [{ bggId: p.bggId, name: p.name }],
      ),
    },
    publisher: formatCommaSeparatedList(version.publishers.map((p) => p.name)),
    editionLanguages: formatCommaSeparatedList(version.languages),
  };
}

/** Edition des Exemplars für `createGameCopy`/`updateGameCopy` — `null`, wenn
 * keine gewählt ist (entfernt eine bestehende Edition). */
export function editionSelectionFromForm(
  form: BoardGameFormValues,
): EditionSelection | null {
  if (form.editionMode === "existing" && form.editionVersionId) {
    return { versionId: form.editionVersionId };
  }
  const version = formToVersionInput(form);
  return version ? { version } : null;
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
    averageRating: form.averageRating ? Number(form.averageRating) : undefined,
    imageUrl: form.imageUrl || undefined,
    description: form.description || undefined,
    mechanics: parseMechanics(form.mechanics),
    categories: parseCommaSeparatedList(form.categories),
    explainerVideoUrl: form.explainerVideoUrl || undefined,
    languageDependence: form.languageDependence,
    author: parseCommaSeparatedList(form.author),
    illustrator: parseCommaSeparatedList(form.illustrator),
    yearPublished: form.yearPublished ? Number(form.yearPublished) : undefined,
    version: formToVersionInput(form) ?? undefined,
    traits: form.traits,
    notes: form.notes || undefined,
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

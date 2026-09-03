import type { GameZustand } from "@/lib/ludothek/holdings";
import {
  BoardGameKind,
  type LanguageDependence,
  type RuleBookLanguage,
} from "@prisma/client";
import { firstString } from "@/lib/utils/search-params";
import { languageDependenceLevel } from "@/lib/ludothek/language-dependence";

/** A title referenced from a copy (e.g. base game/expansion) — titles have no
 * route of their own, only their copies do (see ADR 0008). Guest-safe: no
 * location/person data (that's added separately for internal viewers, see
 * `RelatedGameCard`). */
export type LudothekGameRef = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
};

/**
 * Richest possible shape of a game for the Ludothek browser. The internal
 * view renders every field; the public view strips location/person data via
 * `toPublicGame` before anything reaches the client.
 */
export type LudothekGame = {
  /** GameCopy id — one row per physical copy. */
  id: string;
  /** BoardGame (title) id — shared by every copy of this title. */
  boardGameId: string;
  /** GameCopy slug — kept for admin deep-links, no longer the detail page's routing basis. */
  slug: string;
  /** BoardGame (title) slug — the detail page routes by this, see ADR on the exemplar→title slug migration. */
  boardGameSlug: string;
  title: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  /** BGGs Community-Durchschnittsbewertung (0–10), `null` ohne Bewertungen
   * oder ohne BGG-ID (#214). */
  averageRating: number | null;
  mechanics: string[];
  /** BGGs `boardgamecategory`-Links, analog `mechanics` (#404). */
  categories: string[];
  /** Only needed to seed the edit form for games:manage holders — not for display. */
  ean: string | null;
  condition: string | null;
  /** Freie Inventarnummer des Exemplars (#270) — internes Identifikationsfeld. */
  inventoryNumber: string | null;
  bggId: number | null;
  /** BGG-Alternativnamen, ungefiltert (#187) — matcht in der Suche wie der
   * Titel selbst; die Anzeige zeigt nur `secondaryTitle` (falls gesetzt),
   * nicht diese volle Liste. */
  alternateNames: string[];
  /** Ein zweiter Titel, der neben `title` angezeigt wird (#203) — eigenes
   * `BoardGame`-Feld, `null` solange keiner gesetzt wurde. */
  secondaryTitle: string | null;
  description: string | null;
  explainerVideoUrl: string | null;
  kind: BoardGameKind;
  /** BGGs Language-Dependence-Poll-Level, `null` solange nicht erfasst (#188). */
  languageDependence: LanguageDependence | null;
  /** Regelheft-Sprache(n) dieses Exemplars (#188). */
  ruleBookLanguages: RuleBookLanguage[];
  /** Verlag(e), mehrere bei Co-Publishern (#205). */
  publisher: string[];
  /** Autor(en)/Designer (#205). */
  author: string[];
  /** Erstveröffentlichungsjahr (#205). */
  yearPublished: number | null;
  /** Base game(s) this expansion belongs to — empty unless `kind` is BOARDGAME_EXPANSION. */
  baseGames: LudothekGameRef[];
  /** Expansions in the collection that belong to this base game. */
  expansions: LudothekGameRef[];
  zustand: GameZustand;
  isLoanedOut: boolean;
  responsibleMeepleId: string | null;
  /** Display name for `responsibleMeepleId` — a person or the keeper of the
   * storage unit chain, whichever comes first (#121 Standort-Kette). */
  responsibleName: string | null;
  /** True, solange der aktuelle Halter die Übernahme nach einer Weitergabe
   * noch nicht bestätigt hat (`GameHolding.confirmedAt === null`, #456). */
  isUnconfirmed: boolean;
  /** Storage units only, outermost → innermost — no person prefix (see
   * `locationChain` for the combined, person-first display string). */
  unitChain: string;
  /** Person/event first, then the storage chain — the ready-to-render
   * display string every simple consumer uses (#121 Standort-Kette). */
  locationChain: string;
  /** Erklärbären count for this title — shown in the list-row hover overlay
   * (#143). Public, not location/person data, so it survives `toPublicGame`. */
  explainerCount: number;
  /** Whether this title has at least one open (see `getLfgStatus`) LfgPost —
   * backs the members-only "Zeige nur Spielergesuche"-Filter (#144). */
  hasOpenLfg: boolean;
  /** True for a Meeple's privately imported BGG title (#255-Folge) — no
   * `GameCopy` behind it, `zustand` is always `"privat"`, no Detailseite. */
  isPrivate: boolean;
};

/**
 * What's left after stripping standort, zustand and person data for guests.
 * description/explainerVideoUrl stay — they're public spielbeschreibung, not
 * inventory data.
 */
export type PublicLudothekGame = Omit<
  LudothekGame,
  | "zustand"
  | "isLoanedOut"
  | "responsibleMeepleId"
  | "responsibleName"
  | "isUnconfirmed"
  | "unitChain"
  | "locationChain"
  | "ean"
  | "condition"
  | "inventoryNumber"
  | "bggId"
>;

export function toPublicGame(game: LudothekGame): PublicLudothekGame {
  // Destructured only to strip these fields from the public payload.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    zustand: _zustand,
    isLoanedOut: _isLoanedOut,
    responsibleMeepleId: _responsibleMeepleId,
    responsibleName: _responsibleName,
    isUnconfirmed: _isUnconfirmed,
    unitChain: _unitChain,
    locationChain: _locationChain,
    ean: _ean,
    condition: _condition,
    inventoryNumber: _inventoryNumber,
    bggId: _bggId,
    ...rest
  } = game;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
}

/** Nur noch vom unabhängigen Gastbereich-Filter (`free-games-list.tsx`)
 * genutzt — das Ludothek-Filterpanel selbst nutzt seit #214-Folge `players`
 * (Ein-Knoten-Slider statt fester Buckets). */
export type PlayerCountFilter = "1-2" | "3-4" | "5+";
export type LudothekViewMode = "grid" | "liste" | "compact";

export type LudothekFilters = {
  search?: string;
  /** Exakte Spieleranzahl — matcht jeden Titel, dessen min/maxPlayers diese
   * Zahl einschließt (Ein-Knoten-Slider statt fester Buckets, #214-Folge). */
  players?: number;
  /** Spieldauer von/bis in Minuten (inklusive) — Slider statt fester Buckets
   * (#214-Folge). */
  durationFrom?: number;
  durationTo?: number;
  maxWeight?: number;
  mechanics?: string[];
  /** BGGs Categories (#404) — Filter analog `mechanics`, ODER-verknüpft. */
  categories?: string[];
  hideExpansions?: boolean;
  /** Erstveröffentlichung von/bis (Jahr, inklusive) — beide unabhängig
   * voneinander setzbar (#205). */
  yearFrom?: number;
  yearTo?: number;
  /** BGG-Durchschnittsbewertung von/bis (1–10, inklusive), beide unabhängig
   * voneinander setzbar (#214-Folge). */
  ratingFrom?: number;
  ratingTo?: number;
  /** Maximal zulässiges BGG-Poll-Level (1–5, s. `LANGUAGE_DEPENDENCE_BY_LEVEL`)
   * für Sprachabhängigkeit — Ein-Knoten-Slider, `undefined` = "Alle" (#188). */
  languageDependenceMax?: number;
  /** Defaults to "grid" when unset — only `parseLudothekSearchParams` sets it explicitly. */
  view?: LudothekViewMode;
  /** Internal-only filters — harmless to pass for the public view, they just never match. */
  zustand?: GameZustand;
  onlyLoanedOut?: boolean;
  atMeepleId?: string;
  /** Default off. Internal-only — the crowdsourced private-collection search never runs for guests. */
  showPrivateCollection?: boolean;
  /** Default off. Members-only — matches when a title has at least one open LfgPost (#144). */
  onlyWithOpenLfg?: boolean;
  /** Default off. Public — "Erklärbär vorhanden" (#256). For Meeples: ≥1
   * `ExplainerGame`-Eintrag (`explainerCount > 0`). For Gäste während eines
   * laufenden Events: enger — ≥1 Erklärbär mit `ExplainerAttendance` =
   * "heute anwesend" (siehe `attendingExplainerBoardGameIds` in
   * `filterLudothekGames`). */
  hasExplainer?: boolean;
  /** Default off. Nur sinnvoll während eines laufenden Events — "nur
   * anwesende Spiele" (#273), siehe `presentGameCopyIds` in
   * `filterLudothekGames`. Kein Zeit-Gate an `event.endsAt`: ein Exemplar,
   * das nach Event-Ende noch auf der Event-Unit liegt, gilt bewusst
   * weiterhin als anwesend. */
  onlyPresentAtEvent?: boolean;
};

type PlayerCounted = { minPlayers: number | null; maxPlayers: number | null };
type Timed = { playTimeMinutes: number | null };

/** Slider-Obergrenze für den Spieler-Filter — 1–8 sind exakte Werte, ab hier
 * ("9+") reicht es, wenn der Titel mindestens so viele Spieler unterstützt,
 * damit einzelne Ausreißer (z. B. ein 20-Spieler-Partyspiel) nicht die ganze
 * Skala stauchen (#214-Folge-Korrektur). */
export const MAX_PLAYERS_FILTER = 9;

/** Zeigt Titel, die genau `players` Spieler unterstützen — Ein-Knoten-Slider
 * statt fester Buckets (#214-Folge). Ab `MAX_PLAYERS_FILTER` ("9+") reicht
 * es, wenn der Titel mindestens so viele Spieler unterstützt. */
export function matchesPlayerCount(
  game: PlayerCounted,
  players: number | undefined,
): boolean {
  if (players === undefined) return true;
  const max = game.maxPlayers ?? game.minPlayers ?? 0;
  const min = game.minPlayers ?? max;
  if (players >= MAX_PLAYERS_FILTER) return max >= MAX_PLAYERS_FILTER;
  return players >= min && players <= max;
}

/** Kein erfasster Wert kann keinen gesetzten Bereich erfüllen, analog zu
 * Erstveröffentlichung und Bewertung — Slider statt fester Buckets
 * (#214-Folge). */
export function matchesDurationRange(
  game: Timed,
  from: number | undefined,
  to: number | undefined,
): boolean {
  if (from === undefined && to === undefined) return true;
  if (game.playTimeMinutes === null) return false;
  if (from !== undefined && game.playTimeMinutes < from) return false;
  if (to !== undefined && game.playTimeMinutes > to) return false;
  return true;
}

const VIEW_MODE_VALUES = new Set<LudothekViewMode>([
  "grid",
  "liste",
  "compact",
]);

/** Shared by the year and rating range filters (both plain numbers). */
function parseNumberParam(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Turns a Next.js `searchParams` object into filters — the single source of truth for URLs. */
export function parseLudothekSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  { internal }: { internal: boolean },
): LudothekFilters {
  const maxWeightRaw = firstString(searchParams.gewicht);
  const mechanikRaw = searchParams.mechanik;
  const kategorieRaw = searchParams.kategorie;
  const view = firstString(searchParams.ansicht);

  const filters: LudothekFilters = {
    search: firstString(searchParams.q) || undefined,
    view: VIEW_MODE_VALUES.has(view as LudothekViewMode)
      ? (view as LudothekViewMode)
      : "grid",
    players: parseNumberParam(firstString(searchParams.spieler)),
    durationFrom: parseNumberParam(firstString(searchParams.dauerVon)),
    durationTo: parseNumberParam(firstString(searchParams.dauerBis)),
    maxWeight:
      maxWeightRaw && !Number.isNaN(Number(maxWeightRaw))
        ? Number(maxWeightRaw)
        : undefined,
    mechanics: mechanikRaw
      ? Array.isArray(mechanikRaw)
        ? mechanikRaw
        : [mechanikRaw]
      : undefined,
    categories: kategorieRaw
      ? Array.isArray(kategorieRaw)
        ? kategorieRaw
        : [kategorieRaw]
      : undefined,
    hideExpansions: firstString(searchParams.ohneErweiterungen) === "1",
    yearFrom: parseNumberParam(firstString(searchParams.jahrVon)),
    yearTo: parseNumberParam(firstString(searchParams.jahrBis)),
    ratingFrom: parseNumberParam(firstString(searchParams.bewertungVon)),
    ratingTo: parseNumberParam(firstString(searchParams.bewertungBis)),
    languageDependenceMax: parseNumberParam(firstString(searchParams.sprache)),
    hasExplainer: firstString(searchParams.erklaerbaer) === "1",
    onlyPresentAtEvent: firstString(searchParams.anwesend) === "1",
  };

  if (internal) {
    filters.zustand = firstString(searchParams.zustand) as
      GameZustand | undefined;
    filters.onlyLoanedOut = firstString(searchParams.ausgeliehen) === "1";
    filters.atMeepleId = firstString(searchParams.bei) || undefined;
    filters.showPrivateCollection =
      firstString(searchParams.privatbesitz) === "1";
    filters.onlyWithOpenLfg = firstString(searchParams.nurGesuche) === "1";
  }

  return filters;
}

/** Title/Alternativnamen/Verlag/Autor match as a substring; EAN/BGG-ID only
 * as an exact match — a partial EAN/BGG-ID hit has no business meaning
 * (#187, Verlag/Autor seit #205). */
export function matchesLudothekSearch(
  game: Pick<
    LudothekGame,
    | "title"
    | "secondaryTitle"
    | "ean"
    | "bggId"
    | "alternateNames"
    | "publisher"
    | "author"
  >,
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  if (game.title.toLowerCase().includes(term)) return true;
  if (game.secondaryTitle?.toLowerCase().includes(term)) return true;
  if (game.ean !== null && game.ean === search.trim()) return true;
  if (game.bggId !== null && String(game.bggId) === search.trim()) return true;
  if (game.alternateNames.some((name) => name.toLowerCase().includes(term)))
    return true;
  if (game.publisher.some((name) => name.toLowerCase().includes(term)))
    return true;
  if (game.author.some((name) => name.toLowerCase().includes(term)))
    return true;

  return false;
}

export function filterLudothekGames(
  games: LudothekGame[],
  filters: LudothekFilters,
  {
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
  }: {
    /** Gast-während-Event-Kontext (#256): wenn gesetzt, ersetzt diese Menge
     * die einfache `explainerCount > 0`-Prüfung durch "hat ein gerade
     * anwesender Erklärbär". Weglassen für den Meeple-Kontext. */
    attendingExplainerBoardGameIds?: Set<string>;
    /** GameCopy-Ids, deren Ahnenkette gerade die Event-Unit erreicht (#273) —
     * nötig für `filters.onlyPresentAtEvent`. Weglassen/leer lassen, solange
     * kein Event läuft. */
    presentGameCopyIds?: Set<string>;
  } = {},
): LudothekGame[] {
  return games.filter((game) => {
    if (filters.search && !matchesLudothekSearch(game, filters.search)) {
      return false;
    }
    if (!matchesPlayerCount(game, filters.players)) {
      return false;
    }
    if (!matchesDurationRange(game, filters.durationFrom, filters.durationTo)) {
      return false;
    }
    if (filters.maxWeight !== undefined) {
      if (game.weight === null || game.weight > filters.maxWeight) return false;
    }
    if (filters.mechanics && filters.mechanics.length > 0) {
      const hasAny = filters.mechanics.some((m) => game.mechanics.includes(m));
      if (!hasAny) return false;
    }
    if (filters.categories && filters.categories.length > 0) {
      const hasAny = filters.categories.some((c) =>
        game.categories.includes(c),
      );
      if (!hasAny) return false;
    }
    if (
      filters.hideExpansions &&
      game.kind === BoardGameKind.BOARDGAME_EXPANSION
    ) {
      return false;
    }
    if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
      // Kein erfasstes Jahr kann keinen gesetzten Bereich erfüllen — anders
      // als bei `maxWeight` gibt es hier keinen sinnvollen Default (#205).
      if (game.yearPublished === null) return false;
      if (
        filters.yearFrom !== undefined &&
        game.yearPublished < filters.yearFrom
      )
        return false;
      if (filters.yearTo !== undefined && game.yearPublished > filters.yearTo)
        return false;
    }
    if (filters.ratingFrom !== undefined || filters.ratingTo !== undefined) {
      // Wie beim Erstveröffentlichungsjahr: ohne Bewertung kann kein
      // gesetzter Bereich erfüllt werden (#214-Folge).
      if (game.averageRating === null) return false;
      if (
        filters.ratingFrom !== undefined &&
        game.averageRating < filters.ratingFrom
      )
        return false;
      if (
        filters.ratingTo !== undefined &&
        game.averageRating > filters.ratingTo
      )
        return false;
    }
    if (filters.languageDependenceMax !== undefined) {
      // Kein erfasstes Level kann keinen gesetzten Schwellwert erfüllen,
      // analog zu Erstveröffentlichung und Bewertung (#188).
      if (game.languageDependence === null) return false;
      if (
        languageDependenceLevel(game.languageDependence) >
        filters.languageDependenceMax
      )
        return false;
    }
    if (filters.zustand && game.zustand !== filters.zustand) {
      return false;
    }
    if (filters.onlyLoanedOut && !game.isLoanedOut) {
      return false;
    }
    if (filters.atMeepleId && game.responsibleMeepleId !== filters.atMeepleId) {
      return false;
    }
    if (filters.onlyWithOpenLfg && !game.hasOpenLfg) {
      return false;
    }
    if (filters.hasExplainer) {
      const hasAttendingExplainer = attendingExplainerBoardGameIds
        ? attendingExplainerBoardGameIds.has(game.boardGameId)
        : game.explainerCount > 0;
      if (!hasAttendingExplainer) return false;
    }
    if (filters.onlyPresentAtEvent) {
      if (!presentGameCopyIds?.has(game.id)) return false;
    }
    return true;
  });
}

/** Every distinct mechanic across the Bestand, sorted — Autocomplete-Vorschläge
 * for the Mechanik-Filter and the Mechaniken-Multiselect on the title-edit
 * dialog (#124). */
export function listDistinctMechanics(games: { mechanics: string[] }[]) {
  return [...new Set(games.flatMap((game) => game.mechanics))].sort();
}

/** Every distinct category across the Bestand, sorted — Autocomplete-
 * Vorschläge for the Kategorie-Filter (#404), analog `listDistinctMechanics`. */
export function listDistinctCategories(games: { categories: string[] }[]) {
  return [...new Set(games.flatMap((game) => game.categories))].sort();
}

/** Obergrenze für den Dauer-Slider (Minuten) — höchste im Bestand erfasste
 * Spieldauer, aufgerundet auf 30-Minuten-Schritte, mindestens aber der
 * Standard-Fallback (#214-Folge). */
export function findMaxDurationBound(games: Timed[], fallback = 120): number {
  const highest = Math.max(
    fallback,
    ...games.map((game) => game.playTimeMinutes ?? 0),
  );
  return Math.ceil(highest / 30) * 30;
}

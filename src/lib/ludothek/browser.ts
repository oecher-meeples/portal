import type { GameZustand } from "@/lib/ludothek/holdings";
import { BoardGameKind } from "@prisma/client";
import { firstString } from "@/lib/utils/search-params";

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
  mechanics: string[];
  /** Only needed to seed the edit form for games:manage holders — not for display. */
  ean: string | null;
  condition: string | null;
  bggId: number | null;
  description: string | null;
  explainerVideoUrl: string | null;
  kind: BoardGameKind;
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
  | "unitChain"
  | "locationChain"
  | "ean"
  | "condition"
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
    unitChain: _unitChain,
    locationChain: _locationChain,
    ean: _ean,
    condition: _condition,
    bggId: _bggId,
    ...rest
  } = game;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
}

export type PlayerCountFilter = "1-2" | "3-4" | "5+";
export type DurationFilter = "short" | "mid" | "long";
export type LudothekViewMode = "grid" | "liste" | "compact";

export type LudothekFilters = {
  search?: string;
  players?: PlayerCountFilter;
  duration?: DurationFilter;
  maxWeight?: number;
  mechanics?: string[];
  hideExpansions?: boolean;
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
};

type PlayerCounted = { minPlayers: number | null; maxPlayers: number | null };
type Timed = { playTimeMinutes: number | null };

export function matchesPlayerFilter(
  game: PlayerCounted,
  filter: PlayerCountFilter,
) {
  const max = game.maxPlayers ?? game.minPlayers ?? 0;
  const min = game.minPlayers ?? max;
  if (filter === "1-2") return min <= 2;
  if (filter === "3-4") return max >= 3 && min <= 4;
  return max >= 5;
}

export function matchesDurationFilter(game: Timed, filter: DurationFilter) {
  const minutes = game.playTimeMinutes ?? 0;
  if (filter === "short") return minutes > 0 && minutes < 60;
  if (filter === "mid") return minutes >= 60 && minutes <= 120;
  return minutes > 120;
}

const PLAYER_FILTER_VALUES = new Set<PlayerCountFilter>(["1-2", "3-4", "5+"]);
const DURATION_FILTER_VALUES = new Set<DurationFilter>([
  "short",
  "mid",
  "long",
]);
const VIEW_MODE_VALUES = new Set<LudothekViewMode>([
  "grid",
  "liste",
  "compact",
]);

/** Turns a Next.js `searchParams` object into filters — the single source of truth for URLs. */
export function parseLudothekSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  { internal }: { internal: boolean },
): LudothekFilters {
  const players = firstString(searchParams.spieler);
  const duration = firstString(searchParams.dauer);
  const maxWeightRaw = firstString(searchParams.gewicht);
  const mechanikRaw = searchParams.mechanik;
  const view = firstString(searchParams.ansicht);

  const filters: LudothekFilters = {
    search: firstString(searchParams.q) || undefined,
    view: VIEW_MODE_VALUES.has(view as LudothekViewMode)
      ? (view as LudothekViewMode)
      : "grid",
    players: PLAYER_FILTER_VALUES.has(players as PlayerCountFilter)
      ? (players as PlayerCountFilter)
      : undefined,
    duration: DURATION_FILTER_VALUES.has(duration as DurationFilter)
      ? (duration as DurationFilter)
      : undefined,
    maxWeight:
      maxWeightRaw && !Number.isNaN(Number(maxWeightRaw))
        ? Number(maxWeightRaw)
        : undefined,
    mechanics: mechanikRaw
      ? Array.isArray(mechanikRaw)
        ? mechanikRaw
        : [mechanikRaw]
      : undefined,
    hideExpansions: firstString(searchParams.ohneErweiterungen) === "1",
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

/** Title matches as a substring; EAN/BGG-ID only as an exact match — a partial
 * EAN/BGG-ID hit has no business meaning. */
export function matchesLudothekSearch(
  game: Pick<LudothekGame, "title" | "ean" | "bggId">,
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  if (game.title.toLowerCase().includes(term)) return true;
  if (game.ean !== null && game.ean === search.trim()) return true;
  if (game.bggId !== null && String(game.bggId) === search.trim()) return true;

  return false;
}

export function filterLudothekGames(
  games: LudothekGame[],
  filters: LudothekFilters,
): LudothekGame[] {
  return games.filter((game) => {
    if (filters.search && !matchesLudothekSearch(game, filters.search)) {
      return false;
    }
    if (filters.players && !matchesPlayerFilter(game, filters.players)) {
      return false;
    }
    if (filters.duration && !matchesDurationFilter(game, filters.duration)) {
      return false;
    }
    if (filters.maxWeight !== undefined) {
      if (game.weight === null || game.weight > filters.maxWeight) return false;
    }
    if (filters.mechanics && filters.mechanics.length > 0) {
      const hasAny = filters.mechanics.some((m) => game.mechanics.includes(m));
      if (!hasAny) return false;
    }
    if (
      filters.hideExpansions &&
      game.kind === BoardGameKind.BOARDGAME_EXPANSION
    ) {
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
    return true;
  });
}

/** Every distinct mechanic across the Bestand, sorted — Autocomplete-Vorschläge
 * for the Mechanik-Filter and the Mechaniken-Multiselect on the title-edit
 * dialog (#124). */
export function listDistinctMechanics(games: { mechanics: string[] }[]) {
  return [...new Set(games.flatMap((game) => game.mechanics))].sort();
}

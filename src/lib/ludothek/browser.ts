import type { GameZustand } from "@/lib/ludothek/holdings";

/**
 * Richest possible shape of a game for the Ludothek browser. The internal
 * view renders every field; the public view strips location/person data via
 * `toPublicGame` before anything reaches the client.
 */
export type LudothekGame = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  mechanics: string[];
  zustand: GameZustand;
  isLoanedOut: boolean;
  responsibleMeepleId: string | null;
  locationChain: string;
};

/** What's left after stripping standort, zustand and person data for guests. */
export type PublicLudothekGame = Omit<
  LudothekGame,
  "zustand" | "isLoanedOut" | "responsibleMeepleId" | "locationChain"
>;

export function toPublicGame(game: LudothekGame): PublicLudothekGame {
  const {
    zustand: _zustand,
    isLoanedOut: _isLoanedOut,
    responsibleMeepleId: _responsibleMeepleId,
    locationChain: _locationChain,
    ...rest
  } = game;
  return rest;
}

export type PlayerCountFilter = "1-2" | "3-4" | "5+";
export type DurationFilter = "short" | "mid" | "long";

export type LudothekFilters = {
  search?: string;
  players?: PlayerCountFilter;
  duration?: DurationFilter;
  maxWeight?: number;
  mechanics?: string[];
  /** Internal-only filters — harmless to pass for the public view, they just never match. */
  zustand?: GameZustand;
  onlyLoanedOut?: boolean;
  atMeepleId?: string;
};

function matchesPlayerFilter(game: LudothekGame, filter: PlayerCountFilter) {
  const max = game.maxPlayers ?? game.minPlayers ?? 0;
  const min = game.minPlayers ?? max;
  if (filter === "1-2") return min <= 2;
  if (filter === "3-4") return max >= 3 && min <= 4;
  return max >= 5;
}

function matchesDurationFilter(game: LudothekGame, filter: DurationFilter) {
  const minutes = game.playTimeMinutes ?? 0;
  if (filter === "short") return minutes > 0 && minutes < 60;
  if (filter === "mid") return minutes >= 60 && minutes <= 120;
  return minutes > 120;
}

const PLAYER_FILTER_VALUES = new Set<PlayerCountFilter>(["1-2", "3-4", "5+"]);
const DURATION_FILTER_VALUES = new Set<DurationFilter>(["short", "mid", "long"]);

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Turns a Next.js `searchParams` object into filters — the single source of truth for URLs. */
export function parseLudothekSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  { internal }: { internal: boolean },
): LudothekFilters {
  const players = firstString(searchParams.spieler);
  const duration = firstString(searchParams.dauer);
  const maxWeightRaw = firstString(searchParams.gewicht);
  const mechanikRaw = searchParams.mechanik;

  const filters: LudothekFilters = {
    search: firstString(searchParams.q) || undefined,
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
  };

  if (internal) {
    filters.zustand = firstString(searchParams.zustand) as GameZustand | undefined;
    filters.onlyLoanedOut = firstString(searchParams.ausgeliehen) === "1";
    filters.atMeepleId = firstString(searchParams.bei) || undefined;
  }

  return filters;
}

export function filterLudothekGames(
  games: LudothekGame[],
  filters: LudothekFilters,
): LudothekGame[] {
  return games.filter((game) => {
    if (
      filters.search &&
      !game.title.toLowerCase().includes(filters.search.toLowerCase())
    ) {
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
    if (filters.zustand && game.zustand !== filters.zustand) {
      return false;
    }
    if (filters.onlyLoanedOut && !game.isLoanedOut) {
      return false;
    }
    if (filters.atMeepleId && game.responsibleMeepleId !== filters.atMeepleId) {
      return false;
    }
    return true;
  });
}

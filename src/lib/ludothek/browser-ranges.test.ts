import { describe, expect, it } from "vitest";
import { BoardGameKind } from "@prisma/client";
import {
  filterLudothekGames,
  parseLudothekSearchParams,
  type LudothekGame,
} from "./browser";

// Split out of browser.test.ts (#214-Folge) — the year/rating/player/duration
// range filters, both the filtering and the parseLudothekSearchParams side,
// pushed the original file past the 400-line limit.
function game(overrides: Partial<LudothekGame> = {}): LudothekGame {
  return {
    id: "game-1",
    boardGameId: "title-1",
    slug: "arche-nova",
    boardGameSlug: "arche-nova",
    title: "Arche Nova",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.7,
    averageRating: 8.5,
    mechanics: ["Engine-Building"],
    categories: [],
    ean: null,
    condition: null,
    inventoryNumber: null,
    bggId: null,
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: "meeple-a",
    responsibleName: "Alex",
    unitChain: "Karton 1",
    locationChain: "Karton 1",
    explainerCount: 0,
    hasOpenLfg: false,
    isPrivate: false,
    ...overrides,
  };
}

describe("filterLudothekGames — Spieler/Dauer-Slider (#214-Folge)", () => {
  it("shows only games that support exactly the given player count (#214-Folge-Korrektur)", () => {
    const small = game({ minPlayers: 1, maxPlayers: 2 });
    const mid = game({ minPlayers: 3, maxPlayers: 6 });
    const large = game({ minPlayers: 5, maxPlayers: 8 });

    expect(filterLudothekGames([small, mid, large], { players: 2 })).toEqual([
      small,
    ]);
    expect(filterLudothekGames([small, mid, large], { players: 4 })).toEqual([
      mid,
    ]);
    // 5 is within both mid's (3–6) and large's (5–8) range.
    expect(filterLudothekGames([small, mid, large], { players: 5 })).toEqual([
      mid,
      large,
    ]);
  });

  it("is a no-op when players is unset", () => {
    const small = game({ minPlayers: 1, maxPlayers: 2 });
    const large = game({ minPlayers: 5, maxPlayers: 8 });

    expect(filterLudothekGames([small, large], {})).toEqual([small, large]);
  });

  it("matches exactly 8 players as an exact value, not '+'", () => {
    const eight = game({ minPlayers: 4, maxPlayers: 8 });
    const six = game({ minPlayers: 2, maxPlayers: 6 });

    expect(filterLudothekGames([eight, six], { players: 8 })).toEqual([eight]);
  });

  it("treats the slider's fixed upper bound (9) as '9+' — at least that many players", () => {
    const nine = game({ minPlayers: 4, maxPlayers: 9 });
    const twelve = game({ minPlayers: 9, maxPlayers: 12 });
    const eight = game({ minPlayers: 2, maxPlayers: 8 });

    expect(filterLudothekGames([nine, twelve, eight], { players: 9 })).toEqual([
      nine,
      twelve,
    ]);
  });

  it("filters by duration range", () => {
    const short = game({ playTimeMinutes: 20 });
    const mid = game({ playTimeMinutes: 90 });
    const long = game({ playTimeMinutes: 180 });

    expect(
      filterLudothekGames([short, mid, long], {
        durationFrom: 0,
        durationTo: 59,
      }),
    ).toEqual([short]);
    expect(
      filterLudothekGames([short, mid, long], {
        durationFrom: 60,
        durationTo: 120,
      }),
    ).toEqual([mid]);
    expect(
      filterLudothekGames([short, mid, long], { durationFrom: 121 }),
    ).toEqual([long]);
  });
});

describe("filterLudothekGames — Erstveröffentlichung von/bis (#205)", () => {
  it("keeps only games published within the given range", () => {
    const games = [
      game({ title: "Alt", yearPublished: 1995 }),
      game({ title: "Mittel", yearPublished: 2015 }),
      game({ title: "Neu", yearPublished: 2023 }),
    ];

    const result = filterLudothekGames(games, {
      yearFrom: 2000,
      yearTo: 2020,
    });

    expect(result.map((g) => g.title)).toEqual(["Mittel"]);
  });

  it("applies only the lower bound when yearTo is unset", () => {
    const games = [
      game({ title: "Alt", yearPublished: 1995 }),
      game({ title: "Neu", yearPublished: 2023 }),
    ];

    expect(
      filterLudothekGames(games, { yearFrom: 2000 }).map((g) => g.title),
    ).toEqual(["Neu"]);
  });

  it("applies only the upper bound when yearFrom is unset", () => {
    const games = [
      game({ title: "Alt", yearPublished: 1995 }),
      game({ title: "Neu", yearPublished: 2023 }),
    ];

    expect(
      filterLudothekGames(games, { yearTo: 2000 }).map((g) => g.title),
    ).toEqual(["Alt"]);
  });

  it("excludes titles without a recorded yearPublished once a bound is set", () => {
    const games = [
      game({ title: "Unbekannt", yearPublished: null }),
      game({ title: "Bekannt", yearPublished: 2020 }),
    ];

    expect(
      filterLudothekGames(games, { yearFrom: 2000 }).map((g) => g.title),
    ).toEqual(["Bekannt"]);
  });

  it("is a no-op when neither bound is set", () => {
    const games = [
      game({ title: "Unbekannt", yearPublished: null }),
      game({ title: "Bekannt", yearPublished: 2020 }),
    ];

    expect(filterLudothekGames(games, {})).toHaveLength(2);
  });
});

describe("filterLudothekGames — Bewertung von/bis (#214-Folge)", () => {
  it("keeps only games rated within the given range", () => {
    const games = [
      game({ title: "Niedrig", averageRating: 4.2 }),
      game({ title: "Mittel", averageRating: 7.5 }),
      game({ title: "Hoch", averageRating: 9.1 }),
    ];

    const result = filterLudothekGames(games, {
      ratingFrom: 6,
      ratingTo: 8,
    });

    expect(result.map((g) => g.title)).toEqual(["Mittel"]);
  });

  it("applies only the lower bound when ratingTo is unset", () => {
    const games = [
      game({ title: "Niedrig", averageRating: 4.2 }),
      game({ title: "Hoch", averageRating: 9.1 }),
    ];

    expect(
      filterLudothekGames(games, { ratingFrom: 6 }).map((g) => g.title),
    ).toEqual(["Hoch"]);
  });

  it("applies only the upper bound when ratingFrom is unset", () => {
    const games = [
      game({ title: "Niedrig", averageRating: 4.2 }),
      game({ title: "Hoch", averageRating: 9.1 }),
    ];

    expect(
      filterLudothekGames(games, { ratingTo: 6 }).map((g) => g.title),
    ).toEqual(["Niedrig"]);
  });

  it("excludes titles without a recorded averageRating once a bound is set", () => {
    const games = [
      game({ title: "Unbekannt", averageRating: null }),
      game({ title: "Bekannt", averageRating: 7 }),
    ];

    expect(
      filterLudothekGames(games, { ratingFrom: 5 }).map((g) => g.title),
    ).toEqual(["Bekannt"]);
  });

  it("is a no-op when neither bound is set", () => {
    const games = [
      game({ title: "Unbekannt", averageRating: null }),
      game({ title: "Bekannt", averageRating: 7 }),
    ];

    expect(filterLudothekGames(games, {})).toHaveLength(2);
  });
});

describe("parseLudothekSearchParams — Bereichs-Filter (#205, #214-Folge)", () => {
  it("parses spieler and dauerVon/dauerBis as numbers", () => {
    const result = parseLudothekSearchParams(
      {
        spieler: "4",
        dauerVon: "60",
        dauerBis: "120",
      },
      { internal: false },
    );

    expect(result.players).toBe(4);
    expect(result.durationFrom).toBe(60);
    expect(result.durationTo).toBe(120);
  });

  it("ignores non-numeric spieler/dauerVon instead of applying a wrong filter", () => {
    const result = parseLudothekSearchParams(
      { spieler: "nonsense", dauerVon: "" },
      { internal: false },
    );

    expect(result.players).toBeUndefined();
    expect(result.durationFrom).toBeUndefined();
  });

  it("parses jahrVon/jahrBis as numbers (#205)", () => {
    const result = parseLudothekSearchParams(
      { jahrVon: "2000", jahrBis: "2020" },
      { internal: false },
    );

    expect(result.yearFrom).toBe(2000);
    expect(result.yearTo).toBe(2020);
  });

  it("ignores a non-numeric jahrVon/jahrBis instead of applying a wrong filter", () => {
    const result = parseLudothekSearchParams(
      { jahrVon: "nonsense", jahrBis: "" },
      { internal: false },
    );

    expect(result.yearFrom).toBeUndefined();
    expect(result.yearTo).toBeUndefined();
  });

  it("parses bewertungVon/bewertungBis as numbers (#214-Folge)", () => {
    const result = parseLudothekSearchParams(
      { bewertungVon: "6", bewertungBis: "9" },
      { internal: false },
    );

    expect(result.ratingFrom).toBe(6);
    expect(result.ratingTo).toBe(9);
  });

  it("ignores a non-numeric bewertungVon/bewertungBis instead of applying a wrong filter", () => {
    const result = parseLudothekSearchParams(
      { bewertungVon: "nonsense", bewertungBis: "" },
      { internal: false },
    );

    expect(result.ratingFrom).toBeUndefined();
    expect(result.ratingTo).toBeUndefined();
  });
});

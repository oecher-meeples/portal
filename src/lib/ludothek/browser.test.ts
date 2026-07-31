import { describe, expect, it } from "vitest";
import {
  filterLudothekGames,
  parseLudothekSearchParams,
  toPublicGame,
  type LudothekGame,
} from "./browser";

function game(overrides: Partial<LudothekGame> = {}): LudothekGame {
  return {
    id: "game-1",
    slug: "arche-nova",
    title: "Arche Nova",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.7,
    mechanics: ["Engine-Building"],
    ean: null,
    condition: null,
    bggId: null,
    description: null,
    explainerVideoUrl: null,
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: "meeple-a",
    locationChain: "Karton 1",
    ...overrides,
  };
}

describe("filterLudothekGames", () => {
  it("filters by search text", () => {
    const games = [game({ title: "Arche Nova" }), game({ title: "Wingspan" })];

    expect(filterLudothekGames(games, { search: "wing" })).toHaveLength(1);
  });

  it("filters by player-count range", () => {
    const small = game({ minPlayers: 1, maxPlayers: 2 });
    const mid = game({ minPlayers: 3, maxPlayers: 4 });
    const large = game({ minPlayers: 5, maxPlayers: 8 });

    expect(
      filterLudothekGames([small, mid, large], { players: "1-2" }),
    ).toEqual([small]);
    expect(
      filterLudothekGames([small, mid, large], { players: "3-4" }),
    ).toEqual([mid]);
    expect(filterLudothekGames([small, mid, large], { players: "5+" })).toEqual(
      [large],
    );
  });

  it("includes a game spanning a range across the filter boundary", () => {
    const spanning = game({ minPlayers: 2, maxPlayers: 5 });

    expect(filterLudothekGames([spanning], { players: "3-4" })).toEqual([
      spanning,
    ]);
  });

  it("filters by duration bucket", () => {
    const short = game({ playTimeMinutes: 20 });
    const mid = game({ playTimeMinutes: 90 });
    const long = game({ playTimeMinutes: 180 });

    expect(
      filterLudothekGames([short, mid, long], { duration: "short" }),
    ).toEqual([short]);
    expect(
      filterLudothekGames([short, mid, long], { duration: "mid" }),
    ).toEqual([mid]);
    expect(
      filterLudothekGames([short, mid, long], { duration: "long" }),
    ).toEqual([long]);
  });

  it("filters by maximum weight", () => {
    const light = game({ weight: 1.5 });
    const heavy = game({ weight: 4.2 });

    expect(filterLudothekGames([light, heavy], { maxWeight: 2 })).toEqual([
      light,
    ]);
  });

  it("filters by mechanic with a multi-select OR match", () => {
    const engineBuilding = game({ mechanics: ["Engine-Building"] });
    const tileLaying = game({ mechanics: ["Plättchenlegen"] });
    const both = game({ mechanics: ["Engine-Building", "Plättchenlegen"] });

    const result = filterLudothekGames([engineBuilding, tileLaying, both], {
      mechanics: ["Plättchenlegen"],
    });

    expect(result).toEqual([tileLaying, both]);
  });

  it("filters by 'ist ausgeliehen'", () => {
    const loaned = game({ isLoanedOut: true });
    const free = game({ isLoanedOut: false });

    expect(
      filterLudothekGames([loaned, free], { onlyLoanedOut: true }),
    ).toEqual([loaned]);
  });

  it("filters by 'bei Meeple X', including box contents resolved upstream", () => {
    const atA = game({ responsibleMeepleId: "meeple-a" });
    const atB = game({ responsibleMeepleId: "meeple-b" });
    const atNone = game({ responsibleMeepleId: null });

    expect(
      filterLudothekGames([atA, atB, atNone], { atMeepleId: "meeple-a" }),
    ).toEqual([atA]);
  });

  it("combines multiple filters", () => {
    const match = game({
      title: "Arche Nova",
      minPlayers: 1,
      maxPlayers: 4,
      playTimeMinutes: 90,
      mechanics: ["Engine-Building"],
    });
    const wrongDuration = game({ ...match, playTimeMinutes: 20 });

    const result = filterLudothekGames([match, wrongDuration], {
      search: "arche",
      players: "3-4",
      duration: "mid",
      mechanics: ["Engine-Building"],
    });

    expect(result).toEqual([match]);
  });

  it("returns an empty result when nothing matches", () => {
    expect(filterLudothekGames([game()], { search: "nonexistent" })).toEqual(
      [],
    );
  });
});

describe("parseLudothekSearchParams", () => {
  it("parses search, players, duration, weight and mechanics", () => {
    expect(
      parseLudothekSearchParams(
        {
          q: "arche",
          spieler: "3-4",
          dauer: "mid",
          gewicht: "3.5",
          mechanik: ["Engine-Building", "Plättchenlegen"],
        },
        { internal: false },
      ),
    ).toEqual({
      search: "arche",
      players: "3-4",
      duration: "mid",
      maxWeight: 3.5,
      mechanics: ["Engine-Building", "Plättchenlegen"],
    });
  });

  it("ignores invalid enum values instead of applying a wrong filter", () => {
    expect(
      parseLudothekSearchParams(
        { spieler: "nonsense", dauer: "nonsense" },
        { internal: false },
      ),
    ).toEqual({
      search: undefined,
      players: undefined,
      duration: undefined,
      maxWeight: undefined,
      mechanics: undefined,
    });
  });

  it("only parses internal filters when internal is true", () => {
    const publicResult = parseLudothekSearchParams(
      { zustand: "frei", ausgeliehen: "1", bei: "meeple-1" },
      { internal: false },
    );
    expect(publicResult.zustand).toBeUndefined();
    expect(publicResult.onlyLoanedOut).toBeUndefined();
    expect(publicResult.atMeepleId).toBeUndefined();

    const internalResult = parseLudothekSearchParams(
      { zustand: "frei", ausgeliehen: "1", bei: "meeple-1" },
      { internal: true },
    );
    expect(internalResult.zustand).toBe("frei");
    expect(internalResult.onlyLoanedOut).toBe(true);
    expect(internalResult.atMeepleId).toBe("meeple-1");
  });

  it("normalises a single mechanik value to an array", () => {
    expect(
      parseLudothekSearchParams(
        { mechanik: "Engine-Building" },
        { internal: false },
      ).mechanics,
    ).toEqual(["Engine-Building"]);
  });
});

describe("toPublicGame", () => {
  it("strips zustand, location and person data", () => {
    const publicGame = toPublicGame(game());

    expect(publicGame).not.toHaveProperty("zustand");
    expect(publicGame).not.toHaveProperty("isLoanedOut");
    expect(publicGame).not.toHaveProperty("responsibleMeepleId");
    expect(publicGame).not.toHaveProperty("locationChain");
    expect(publicGame.title).toBe("Arche Nova");
  });
});

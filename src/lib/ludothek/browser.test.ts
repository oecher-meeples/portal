import { describe, expect, it } from "vitest";
import { BoardGameKind, LanguageDependence } from "@prisma/client";
import {
  filterLudothekGames,
  listDistinctCategories,
  parseLudothekSearchParams,
  toPublicGame,
  type LudothekGame,
} from "./browser";

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
    responsibleProfilePictureUrl: null,
    responsibleProfilePictureVisibility: "INTERN",
    isUnconfirmed: false,
    unitChain: "Karton 1",
    locationChain: "Karton 1",
    explainerCount: 0,
    hasOpenLfg: false,
    isPrivate: false,
    ...overrides,
  };
}

describe("filterLudothekGames", () => {
  it("filters by search text", () => {
    const games = [game({ title: "Arche Nova" }), game({ title: "Wingspan" })];

    expect(filterLudothekGames(games, { search: "wing" })).toHaveLength(1);
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

  it("filters by category with a multi-select OR match (#404)", () => {
    const party = game({ categories: ["Partyspiel"] });
    const strategy = game({ categories: ["Strategiespiel"] });
    const both = game({ categories: ["Partyspiel", "Strategiespiel"] });

    const result = filterLudothekGames([party, strategy, both], {
      categories: ["Partyspiel"],
    });

    expect(result).toEqual([party, both]);
  });

  it("filters by maximum language dependence level (#188)", () => {
    const neutral = game({
      languageDependence: LanguageDependence.NO_NECESSARY_TEXT,
    });
    const extensive = game({
      languageDependence: LanguageDependence.EXTENSIVE_TEXT,
    });
    const unrated = game({ languageDependence: null });

    expect(
      filterLudothekGames([neutral, extensive, unrated], {
        languageDependenceMax: 1,
      }),
    ).toEqual([neutral]);
  });

  it("excludes games without a captured language dependence when the filter is set", () => {
    const unrated = game({ languageDependence: null });

    expect(
      filterLudothekGames([unrated], { languageDependenceMax: 5 }),
    ).toEqual([]);
  });

  it("hides expansions when hideExpansions is set", () => {
    const base = game({ kind: BoardGameKind.BOARDGAME });
    const expansion = game({ kind: BoardGameKind.BOARDGAME_EXPANSION });

    expect(
      filterLudothekGames([base, expansion], { hideExpansions: true }),
    ).toEqual([base]);
    expect(
      filterLudothekGames([base, expansion], { hideExpansions: false }),
    ).toEqual([base, expansion]);
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

  it("filters by 'nur mit offenen Spielergesuchen' (#144)", () => {
    const withOpenLfg = game({ hasOpenLfg: true });
    const withoutOpenLfg = game({ hasOpenLfg: false });

    expect(
      filterLudothekGames([withOpenLfg, withoutOpenLfg], {
        onlyWithOpenLfg: true,
      }),
    ).toEqual([withOpenLfg]);
    expect(
      filterLudothekGames([withOpenLfg, withoutOpenLfg], {
        onlyWithOpenLfg: false,
      }),
    ).toEqual([withOpenLfg, withoutOpenLfg]);
  });

  it("filters by 'Erklärbär vorhanden' in the Meeple context via explainerCount (#256)", () => {
    const withExplainer = game({ explainerCount: 2 });
    const withoutExplainer = game({ explainerCount: 0 });

    expect(
      filterLudothekGames([withExplainer, withoutExplainer], {
        hasExplainer: true,
      }),
    ).toEqual([withExplainer]);
  });

  it("filters by 'Erklärbär vorhanden' in the Gast-während-Event context via the attending-set (#256)", () => {
    const attending = game({
      boardGameId: "game-attending",
      explainerCount: 0,
    });
    const notAttending = game({
      boardGameId: "game-not-attending",
      explainerCount: 5, // has an Erklärbär profile, but none attending today
    });

    const result = filterLudothekGames(
      [attending, notAttending],
      { hasExplainer: true },
      { attendingExplainerBoardGameIds: new Set(["game-attending"]) },
    );

    expect(result).toEqual([attending]);
  });

  it("filters by 'nur anwesende Spiele' via presentGameCopyIds (#273)", () => {
    const present = game({ id: "copy-present" });
    const absent = game({ id: "copy-absent" });

    const result = filterLudothekGames(
      [present, absent],
      { onlyPresentAtEvent: true },
      { presentGameCopyIds: new Set(["copy-present"]) },
    );

    expect(result).toEqual([present]);
  });

  it("shows nothing for 'nur anwesende Spiele' when no event is running", () => {
    const result = filterLudothekGames(
      [game({ id: "copy-1" })],
      { onlyPresentAtEvent: true },
      {},
    );

    expect(result).toEqual([]);
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
      players: 3,
      durationFrom: 60,
      durationTo: 120,
      mechanics: ["Engine-Building"],
    });

    expect(result).toEqual([match]);
  });

  it("returns an empty result when nothing matches", () => {
    expect(filterLudothekGames([game()], { search: "nonexistent" })).toEqual(
      [],
    );
  });

  // Erstveröffentlichung-, Bewertung- und Spieler/Dauer-Slider-Tests siehe
  // browser-ranges.test.ts (#214-Folge, ausgelagert wegen Dateigröße).
  // Textsuche (EAN/BGG-ID/Alternativname/Sekundärtitel/Verlag/Autor) siehe
  // browser-search.test.ts (#287, ausgelagert wegen Dateigröße).
});

describe("parseLudothekSearchParams", () => {
  // spielerVon/dauerVon/jahrVon/bewertungVon-Parsing siehe
  // browser-ranges.test.ts (#214-Folge, ausgelagert wegen Dateigröße).
  it("parses search, weight and mechanics", () => {
    expect(
      parseLudothekSearchParams(
        {
          q: "arche",
          gewicht: "3.5",
          mechanik: ["Engine-Building", "Plättchenlegen"],
        },
        { internal: false },
      ),
    ).toEqual({
      search: "arche",
      maxWeight: 3.5,
      mechanics: ["Engine-Building", "Plättchenlegen"],
      hideExpansions: false,
      hasExplainer: false,
      onlyPresentAtEvent: false,
      view: "grid",
    });
  });

  it("parses a valid view mode from ?ansicht=", () => {
    expect(
      parseLudothekSearchParams({ ansicht: "liste" }, { internal: false }).view,
    ).toBe("liste");
    expect(
      parseLudothekSearchParams({ ansicht: "compact" }, { internal: false })
        .view,
    ).toBe("compact");
  });

  it("falls back to grid for an invalid view mode", () => {
    expect(
      parseLudothekSearchParams({ ansicht: "nonsense" }, { internal: false })
        .view,
    ).toBe("grid");
    expect(parseLudothekSearchParams({}, { internal: false }).view).toBe(
      "grid",
    );
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

  it("parses sprache as a number (#188)", () => {
    const result = parseLudothekSearchParams(
      { sprache: "2" },
      { internal: false },
    );

    expect(result.languageDependenceMax).toBe(2);
  });

  it("ignores a non-numeric sprache instead of applying a wrong filter", () => {
    const result = parseLudothekSearchParams(
      { sprache: "nonsense" },
      { internal: false },
    );

    expect(result.languageDependenceMax).toBeUndefined();
  });

  it("only parses internal filters when internal is true", () => {
    const publicResult = parseLudothekSearchParams(
      {
        zustand: "frei",
        ausgeliehen: "1",
        bei: "meeple-1",
        privatbesitz: "1",
        nurGesuche: "1",
      },
      { internal: false },
    );
    expect(publicResult.zustand).toBeUndefined();
    expect(publicResult.onlyLoanedOut).toBeUndefined();
    expect(publicResult.atMeepleId).toBeUndefined();
    expect(publicResult.showPrivateCollection).toBeUndefined();
    expect(publicResult.onlyWithOpenLfg).toBeUndefined();

    const internalResult = parseLudothekSearchParams(
      {
        zustand: "frei",
        ausgeliehen: "1",
        bei: "meeple-1",
        privatbesitz: "1",
        nurGesuche: "1",
      },
      { internal: true },
    );
    expect(internalResult.zustand).toBe("frei");
    expect(internalResult.onlyLoanedOut).toBe(true);
    expect(internalResult.atMeepleId).toBe("meeple-1");
    expect(internalResult.showPrivateCollection).toBe(true);
    expect(internalResult.onlyWithOpenLfg).toBe(true);
  });

  it("defaults showPrivateCollection to false when internal and unset", () => {
    expect(
      parseLudothekSearchParams({}, { internal: true }).showPrivateCollection,
    ).toBe(false);
  });

  it("defaults onlyWithOpenLfg to false when internal and unset", () => {
    expect(
      parseLudothekSearchParams({}, { internal: true }).onlyWithOpenLfg,
    ).toBe(false);
  });

  it("normalises a single mechanik value to an array", () => {
    expect(
      parseLudothekSearchParams(
        { mechanik: "Engine-Building" },
        { internal: false },
      ).mechanics,
    ).toEqual(["Engine-Building"]);
  });

  it("parses categories (#404)", () => {
    expect(
      parseLudothekSearchParams(
        { kategorie: ["Partyspiel", "Strategiespiel"] },
        { internal: false },
      ).categories,
    ).toEqual(["Partyspiel", "Strategiespiel"]);
  });

  it("normalises a single kategorie value to an array (#404)", () => {
    expect(
      parseLudothekSearchParams(
        { kategorie: "Partyspiel" },
        { internal: false },
      ).categories,
    ).toEqual(["Partyspiel"]);
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

describe("listDistinctCategories (#404)", () => {
  it("returns every distinct category across the Bestand, sorted", () => {
    const games = [
      game({ categories: ["Strategiespiel", "Partyspiel"] }),
      game({ categories: ["Familienspiel"] }),
      game({ categories: ["Partyspiel"] }),
    ];

    expect(listDistinctCategories(games)).toEqual([
      "Familienspiel",
      "Partyspiel",
      "Strategiespiel",
    ]);
  });

  it("returns an empty array for no games", () => {
    expect(listDistinctCategories([])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { BoardGameKind } from "@prisma/client";
import { filterLudothekGames, type LudothekGame } from "./browser";

// Split out of browser.test.ts (#287) — die Substring-Match-Tests für Titel/
// Sekundärtitel/Alternativnamen/Verlag/Autor, zusammen mit dem #287-Zuwachs,
// hätten die 400-Zeilen-Grenze der Ursprungsdatei gesprengt.
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
    isUnconfirmed: false,
    unitChain: "Karton 1",
    locationChain: "Karton 1",
    explainerCount: 0,
    hasOpenLfg: false,
    isPrivate: false,
    ...overrides,
  };
}

describe("filterLudothekGames — Textsuche", () => {
  it("matches an exact EAN", () => {
    const games = [
      game({ title: "Arche Nova", ean: "4001504311892" }),
      game({ title: "Wingspan", ean: "0700304142529" }),
    ];

    const result = filterLudothekGames(games, { search: "4001504311892" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Arche Nova");
  });

  it("does not match a partial EAN", () => {
    const games = [game({ title: "Arche Nova", ean: "4001504311892" })];

    expect(filterLudothekGames(games, { search: "400150431" })).toHaveLength(0);
  });

  it("matches an exact BGG-ID", () => {
    const games = [
      game({ title: "Arche Nova", bggId: 342942 }),
      game({ title: "Wingspan", bggId: 266192 }),
    ];

    const result = filterLudothekGames(games, { search: "342942" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Arche Nova");
  });

  it("matches on an alternate name substring, case-insensitively (#187)", () => {
    const games = [
      game({ title: "Catan", alternateNames: ["Die Siedler von Catan"] }),
      game({ title: "Wingspan" }),
    ];

    const result = filterLudothekGames(games, { search: "siedler" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Catan");
  });

  it("matches on a secondary title substring, case-insensitively (#287)", () => {
    const games = [
      game({ title: "Arche Nova", secondaryTitle: "Ark Nova" }),
      game({ title: "Wingspan", secondaryTitle: null }),
    ];

    const result = filterLudothekGames(games, { search: "ark nova" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Arche Nova");
  });

  it("matches on a secondary title substring for private collection titles too (#287)", () => {
    const games = [
      game({
        title: "Terraforming Mars",
        secondaryTitle: "テラフォーミング・マーズ",
        responsibleMeepleId: "meeple-b",
        responsibleName: "Sam",
        zustand: "privat",
      }),
    ];

    const result = filterLudothekGames(games, { search: "テラフォーミング" });
    expect(result).toHaveLength(1);
  });

  it("matches on a publisher substring, case-insensitively (#205)", () => {
    const games = [
      game({ title: "Ark Nova", publisher: ["Feuerland Spiele"] }),
      game({ title: "Wingspan", publisher: ["Stonemaier Games"] }),
    ];

    const result = filterLudothekGames(games, { search: "feuerland" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Ark Nova");
  });

  it("matches on an author substring, case-insensitively (#205)", () => {
    const games = [
      game({ title: "Cascadia", author: ["Randy Flynn"] }),
      game({ title: "Wingspan", author: ["Elizabeth Hargrave"] }),
    ];

    const result = filterLudothekGames(games, { search: "hargrave" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Wingspan");
  });
});

import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  getMyExplainerGames,
  searchBoardGames,
  countWantedGamesWithoutMyLevel,
  parseExplainerGameFilter,
} = await import("@/lib/explainer/game-list-queries");

function game(
  id: string,
  title: string,
  extra: Partial<{
    kind: string;
    wanted: boolean;
    levels: string[];
    bases: string[];
  }> = {},
) {
  return {
    id,
    title,
    imageUrl: null,
    bggId: null,
    kind: extra.kind ?? "BOARDGAME",
    explainerWanted: extra.wanted ?? false,
    expansionCollections: (extra.bases ?? []).map((baseGameId) => ({
      baseGameId,
    })),
    explainerGames: (extra.levels ?? []).map((level) => ({ level })),
  };
}

describe("parseExplainerGameFilter", () => {
  it("falls back to relevant", () => {
    expect(parseExplainerGameFilter(undefined)).toBe("relevant");
    expect(parseExplainerGameFilter("quatsch")).toBe("relevant");
    expect(parseExplainerGameFilter("gesucht")).toBe("wanted");
    expect(parseExplainerGameFilter("bekannte")).toBe("known");
  });
});

describe("getMyExplainerGames", () => {
  it.each([
    ["mine", { privateCollectionEntries: { some: { meepleId: "m-1" } } }],
    ["wanted", { explainerWanted: true }],
    ["known", { explainerGames: { some: { meepleId: "m-1" } } }],
    [
      "relevant",
      {
        OR: [
          { privateCollectionEntries: { some: { meepleId: "m-1" } } },
          { explainerWanted: true },
          { explainerGames: { some: { meepleId: "m-1" } } },
        ],
      },
    ],
  ] as const)("filters %s by the defined set", async (filter, where) => {
    prismaMock.boardGame.findMany.mockResolvedValue([] as never);

    await getMyExplainerGames("m-1", filter);

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, orderBy: { title: "asc" } }),
    );
  });

  it("maps level and wanted flag; games without a level have null", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      game("a", "Azul", { wanted: true }),
      game("b", "Brass", { levels: ["BY_HEART"] }),
    ] as never);

    const rows = await getMyExplainerGames("m-1", "relevant");

    expect(rows).toEqual([
      expect.objectContaining({ boardGameId: "a", level: null, wanted: true }),
      expect.objectContaining({
        boardGameId: "b",
        level: "BY_HEART",
        wanted: false,
      }),
    ]);
  });

  it("lists an expansion once, directly below its first listed base game", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      game("e", "Ahnen", {
        kind: "BOARDGAME_EXPANSION",
        bases: ["x", "a", "w"],
      }),
      game("a", "Azul"),
      game("w", "Wingspan"),
    ] as never);

    const rows = await getMyExplainerGames("m-1", "mine");

    expect(rows.map((r) => r.boardGameTitle)).toEqual([
      "Azul",
      "Ahnen",
      "Wingspan",
    ]);
    expect(rows[1].isExpansion).toBe(true);
  });

  it("keeps an expansion without a listed base at its alphabetical place", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      game("e", "Ahnen", { kind: "BOARDGAME_EXPANSION", bases: ["zzz"] }),
      game("a", "Azul"),
    ] as never);

    const rows = await getMyExplainerGames("m-1", "mine");

    expect(rows.map((r) => r.boardGameTitle)).toEqual(["Ahnen", "Azul"]);
  });
});

describe("searchBoardGames", () => {
  it("returns nothing for an empty query without hitting the DB", async () => {
    expect(await searchBoardGames("  ")).toEqual([]);
    expect(prismaMock.boardGame.findMany).not.toHaveBeenCalled();
  });

  it("searches all games server-side, limited and excluding ids", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([] as never);

    await searchBoardGames(" azu ", 5, ["x"]);

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith({
      where: {
        title: { contains: "azu", mode: "insensitive" },
        id: { notIn: ["x"] },
      },
      orderBy: { title: "asc" },
      take: 5,
      select: { id: true, title: true },
    });
  });

  it("omits the exclusion when there is none", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([] as never);

    await searchBoardGames("azu");

    const call = prismaMock.boardGame.findMany.mock.calls[0][0];
    expect(call?.where).toEqual({
      title: { contains: "azu", mode: "insensitive" },
    });
    expect(call?.take).toBe(10);
  });
});

describe("countWantedGamesWithoutMyLevel", () => {
  it("counts only wanted games without my level", async () => {
    prismaMock.boardGame.count.mockResolvedValue(3 as never);

    expect(await countWantedGamesWithoutMyLevel("m-1")).toBe(3);
    expect(prismaMock.boardGame.count).toHaveBeenCalledWith({
      where: {
        explainerWanted: true,
        explainerGames: { none: { meepleId: "m-1" } },
      },
    });
  });
});

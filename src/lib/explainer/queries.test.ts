import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getExplainersForGame, getExplainerCountsForGames } =
  await import("@/lib/explainer/queries");

describe("getExplainersForGame", () => {
  it("returns an empty list when nobody explains this game", async () => {
    prismaMock.explainerGame.findMany.mockResolvedValue([]);

    expect(await getExplainersForGame("game-1")).toEqual([]);
  });

  it("flattens the meeple relation into meepleId, displayName and level", async () => {
    prismaMock.explainerGame.findMany.mockResolvedValue([
      {
        level: "BY_HEART",
        meeple: { id: "meeple-1", displayName: "Lea Beispiel" },
      },
    ] as never);

    expect(await getExplainersForGame("game-1")).toEqual([
      { meepleId: "meeple-1", displayName: "Lea Beispiel", level: "BY_HEART" },
    ]);
  });

  it("preserves the order the query returns, sorted by name", async () => {
    prismaMock.explainerGame.findMany.mockResolvedValue([
      { level: "WITHOUT_MANUAL", meeple: { id: "m-1", displayName: "Anna" } },
      { level: "WITH_MANUAL", meeple: { id: "m-2", displayName: "Ben" } },
    ] as never);

    const result = await getExplainersForGame("game-1");

    expect(result.map((entry) => entry.displayName)).toEqual(["Anna", "Ben"]);
  });

  it("scopes the query to the requested board game", async () => {
    prismaMock.explainerGame.findMany.mockResolvedValue([]);

    await getExplainersForGame("game-42");

    expect(prismaMock.explainerGame.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { boardGameId: "game-42" } }),
    );
  });
});

describe("getExplainerCountsForGames", () => {
  it("returns an empty map without querying for an empty input", async () => {
    const result = await getExplainerCountsForGames([]);

    expect(result).toEqual(new Map());
    expect(prismaMock.explainerGame.groupBy).not.toHaveBeenCalled();
  });

  it("maps each boardGameId to its Erklärbären count", async () => {
    vi.mocked(prismaMock.explainerGame.groupBy).mockResolvedValue([
      { boardGameId: "game-1", _count: { _all: 2 } },
      { boardGameId: "game-2", _count: { _all: 1 } },
    ] as never);

    const result = await getExplainerCountsForGames(["game-1", "game-2"]);

    expect(result).toEqual(
      new Map([
        ["game-1", 2],
        ["game-2", 1],
      ]),
    );
  });

  it("omits titles with no Erklärbär entirely", async () => {
    vi.mocked(prismaMock.explainerGame.groupBy).mockResolvedValue([] as never);

    const result = await getExplainerCountsForGames(["game-1"]);

    expect(result.has("game-1")).toBe(false);
  });
});

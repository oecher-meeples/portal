import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getExplainersForGame } = await import("@/lib/explainer/queries");

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

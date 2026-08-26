import { describe, expect, it, vi } from "vitest";
import { BoardGameKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/explainer/queries", () => ({
  getExplainerCountsForGames: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/content/lfg", () => ({
  getBoardGameIdsWithOpenLfgPosts: vi.fn().mockResolvedValue(new Set()),
}));

import {
  buildLudothekGames,
  countBoardGameTitles,
  roundDownToHundred,
} from "./query";

describe("buildLudothekGames", () => {
  it("sorts by averageRating descending with unrated titles last (#214)", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);
    prismaMock.storageUnit.findMany.mockResolvedValue([]);

    await buildLudothekGames();

    expect(prismaMock.gameCopy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { boardGame: { averageRating: { sort: "desc", nulls: "last" } } },
          { boardGame: { title: "asc" } },
        ],
      }),
    );
  });
});

describe("countBoardGameTitles", () => {
  it("counts only base-game titles", async () => {
    prismaMock.boardGame.count.mockResolvedValue(642);

    const count = await countBoardGameTitles();

    expect(count).toBe(642);
    expect(prismaMock.boardGame.count).toHaveBeenCalledWith({
      where: { kind: BoardGameKind.BOARDGAME },
    });
  });
});

describe("roundDownToHundred", () => {
  it("rounds down to the nearest hundred", () => {
    expect(roundDownToHundred(642)).toBe(600);
  });

  it("keeps exact hundreds unchanged", () => {
    expect(roundDownToHundred(700)).toBe(700);
  });

  it("rounds down below the first hundred to zero", () => {
    expect(roundDownToHundred(42)).toBe(0);
  });
});

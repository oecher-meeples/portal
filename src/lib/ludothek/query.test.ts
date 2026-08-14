import { describe, expect, it, vi } from "vitest";
import { BoardGameKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

import { countBoardGameTitles, roundDownToHundred } from "./query";

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

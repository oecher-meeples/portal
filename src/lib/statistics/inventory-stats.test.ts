import { describe, expect, it } from "vitest";
import { countBoardGameTitles, countGameCopies } from "./inventory-stats";

describe("countBoardGameTitles (#284)", () => {
  it("counts each source and the union without double-counting overlaps", () => {
    const result = countBoardGameTitles(
      ["game-1", "game-2", "game-3"],
      ["game-2", "game-4"],
    );

    expect(result).toEqual({ club: 3, private: 2, total: 4 });
  });

  it("returns zeros for empty sources", () => {
    expect(countBoardGameTitles([], [])).toEqual({
      club: 0,
      private: 0,
      total: 0,
    });
  });

  it("treats duplicate ids within one source as a single title", () => {
    const result = countBoardGameTitles(["game-1", "game-1"], []);

    expect(result).toEqual({ club: 1, private: 0, total: 1 });
  });
});

describe("countGameCopies (#284)", () => {
  it("sums club and private copy counts without any overlap logic", () => {
    expect(countGameCopies(12, 5)).toEqual({
      club: 12,
      private: 5,
      total: 17,
    });
  });

  it("returns zeros for an empty inventory", () => {
    expect(countGameCopies(0, 0)).toEqual({ club: 0, private: 0, total: 0 });
  });
});

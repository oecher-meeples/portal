import { describe, expect, it } from "vitest";
import { ShelfCategory } from "@prisma/client";
import { deriveShelfCategories } from "./shelf-category";

function game(overrides: Partial<Parameters<typeof deriveShelfCategories>[0]>) {
  return {
    maxPlayers: null,
    weight: null,
    mechanics: [],
    categories: [],
    ...overrides,
  };
}

describe("deriveShelfCategories (#276)", () => {
  it("matches ZWEI_PERSONEN for a 2-player game", () => {
    expect(deriveShelfCategories(game({ maxPlayers: 2 }))).toEqual([
      ShelfCategory.ZWEI_PERSONEN,
    ]);
  });

  it("matches both KOOPERATIV and EXPERTENSPIELE for a heavy cooperative game", () => {
    const result = deriveShelfCategories(
      game({ mechanics: ["Kooperativ"], weight: 3.5 }),
    );

    expect(result).toContain(ShelfCategory.KOOPERATIV);
    expect(result).toContain(ShelfCategory.EXPERTENSPIELE);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array without weight, mechanics or categories", () => {
    expect(deriveShelfCategories(game({}))).toEqual([]);
  });

  it("matches KINDER_FAMILIE for a light game", () => {
    expect(deriveShelfCategories(game({ weight: 1.5 }))).toEqual([
      ShelfCategory.KINDER_FAMILIE,
    ]);
  });

  it("matches KINDER_FAMILIE via a BGG family/children category, regardless of weight", () => {
    expect(
      deriveShelfCategories(game({ weight: 4.0, categories: ["Family Game"] })),
    ).toContain(ShelfCategory.KINDER_FAMILIE);
    expect(
      deriveShelfCategories(
        game({ weight: 4.0, categories: ["Children's Game"] }),
      ),
    ).toContain(ShelfCategory.KINDER_FAMILIE);
  });

  it("matches KENNERSPIELE for a medium-weight game", () => {
    expect(deriveShelfCategories(game({ weight: 2.5 }))).toEqual([
      ShelfCategory.KENNERSPIELE,
    ]);
  });

  it("matches EXPERTENSPIELE for a heavy game", () => {
    expect(deriveShelfCategories(game({ weight: 3.5 }))).toEqual([
      ShelfCategory.EXPERTENSPIELE,
    ]);
  });

  it("matches PARTY via a BGG party category", () => {
    expect(deriveShelfCategories(game({ categories: ["Party Game"] }))).toEqual(
      [ShelfCategory.PARTY],
    );
  });

  it("matches PARTY for a game supporting 6 or more players", () => {
    expect(deriveShelfCategories(game({ maxPlayers: 6 }))).toEqual([
      ShelfCategory.PARTY,
    ]);
  });

  it("does not match PARTY for a game supporting fewer than 6 players", () => {
    expect(deriveShelfCategories(game({ maxPlayers: 5 }))).toEqual([]);
  });

  it("does not match KENNERSPIELE or EXPERTENSPIELE at the KINDER_FAMILIE boundary (weight 2.0)", () => {
    expect(deriveShelfCategories(game({ weight: 2.0 }))).toEqual([
      ShelfCategory.KINDER_FAMILIE,
    ]);
  });

  it("does not match KENNERSPIELE at the EXPERTENSPIELE boundary (weight 3.0)", () => {
    expect(deriveShelfCategories(game({ weight: 3.0 }))).toEqual([
      ShelfCategory.KENNERSPIELE,
    ]);
  });
});

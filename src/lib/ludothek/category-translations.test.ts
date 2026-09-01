import { describe, expect, it } from "vitest";
import {
  translateCategory,
  translateCategories,
} from "./category-translations";

describe("translateCategory (#404)", () => {
  it("translates a known BGG category into German", () => {
    expect(translateCategory("Party Game")).toBe("Partyspiel");
  });

  it("falls back to the original term for an unknown category", () => {
    expect(translateCategory("Some Unmapped Category")).toBe(
      "Some Unmapped Category",
    );
  });
});

describe("translateCategories (#404)", () => {
  it("translates each category in the list independently", () => {
    expect(
      translateCategories(["Party Game", "Strategy Game", "Unknown"]),
    ).toEqual(["Partyspiel", "Strategiespiel", "Unknown"]);
  });

  it("returns an empty array unchanged", () => {
    expect(translateCategories([])).toEqual([]);
  });
});

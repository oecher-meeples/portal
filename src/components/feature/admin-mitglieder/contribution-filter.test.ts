import { describe, expect, it } from "vitest";
import {
  CONTRIBUTION_FILTER_CATEGORIES,
  contributionFilterOption,
  nextContributionFilter,
} from "./contribution-filter";

describe("nextContributionFilter (#340)", () => {
  it("sets the filter when none is active", () => {
    expect(nextContributionFilter(null, ["mini"])).toEqual(["mini"]);
  });

  it("clears the filter when the same category is clicked again", () => {
    expect(nextContributionFilter(["mini"], ["mini"])).toBeNull();
  });

  it("replaces the filter when a different category is clicked", () => {
    expect(nextContributionFilter(["mini"], ["jung"])).toEqual(["jung"]);
  });

  it("treats the combined meeple/individuell filter as one unit", () => {
    expect(
      nextContributionFilter(
        ["meeple", "individuell"],
        ["meeple", "individuell"],
      ),
    ).toBeNull();
  });
});

// #432: das Dropdown teilt sich den State mit dem Stat-Tile-Klick — beide
// Richtungen der Zuordnung müssen zueinander passen.
describe("contributionFilterOption (#432)", () => {
  it("maps null to 'alle'", () => {
    expect(contributionFilterOption(null)).toBe("alle");
  });

  it("maps ['mini'] to 'mini'", () => {
    expect(contributionFilterOption(["mini"])).toBe("mini");
  });

  it("maps ['jung'] to 'jung'", () => {
    expect(contributionFilterOption(["jung"])).toBe("jung");
  });

  it("maps the combined meeple/individuell filter to 'meeple'", () => {
    expect(contributionFilterOption(["meeple", "individuell"])).toBe("meeple");
  });

  it("round-trips through CONTRIBUTION_FILTER_CATEGORIES for every option", () => {
    for (const [option, categories] of Object.entries(
      CONTRIBUTION_FILTER_CATEGORIES,
    )) {
      expect(contributionFilterOption(categories)).toBe(option);
    }
  });
});

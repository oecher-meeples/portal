import { describe, expect, it } from "vitest";
import { nextContributionFilter } from "./contribution-filter";

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

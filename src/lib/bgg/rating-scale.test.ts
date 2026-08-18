import { describe, expect, it } from "vitest";
import { resolveRatingScale } from "./rating-scale";

describe("resolveRatingScale", () => {
  it("returns null when there is no rating", () => {
    expect(resolveRatingScale(null)).toBeNull();
  });

  it("returns null when the rounded rating falls outside 1–10 (e.g. 0 ratings)", () => {
    expect(resolveRatingScale(0)).toBeNull();
    expect(resolveRatingScale(0.4)).toBeNull();
  });

  it("rounds to the nearest integer before looking up the scale", () => {
    expect(resolveRatingScale(8.4)).toEqual({
      rounded: 8,
      hex: "#66BB6A",
      meaning:
        "Sehr gutes Spiel. Ich spiele gerne mit. Werde es wahrscheinlich weiterempfehlen.",
    });
    expect(resolveRatingScale(8.5)).toMatchObject({ rounded: 9 });
  });

  it("resolves the lowest step", () => {
    expect(resolveRatingScale(1.2)).toMatchObject({
      rounded: 1,
      hex: "#B71C1C",
    });
  });

  it("resolves the highest step", () => {
    expect(resolveRatingScale(9.8)).toMatchObject({
      rounded: 10,
      hex: "#1B5E20",
    });
  });
});

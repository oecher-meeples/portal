import { describe, expect, it } from "vitest";
import { computeTargetDimensions } from "@/lib/utils/compress-image";

describe("computeTargetDimensions", () => {
  it("leaves dimensions unchanged when already within the limit", () => {
    expect(computeTargetDimensions(800, 600, 1600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("leaves dimensions unchanged when the longest edge equals the limit", () => {
    expect(computeTargetDimensions(1600, 900, 1600)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it("scales down a landscape image so the width matches the limit", () => {
    expect(computeTargetDimensions(3200, 1600, 1600)).toEqual({
      width: 1600,
      height: 800,
    });
  });

  it("scales down a portrait image so the height matches the limit", () => {
    expect(computeTargetDimensions(1600, 3200, 1600)).toEqual({
      width: 800,
      height: 1600,
    });
  });
});

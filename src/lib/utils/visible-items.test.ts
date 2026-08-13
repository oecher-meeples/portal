import { describe, expect, it } from "vitest";
import { computeVisibleItems } from "@/lib/utils/visible-items";

describe("computeVisibleItems", () => {
  it("slices down to the visible count", () => {
    expect(computeVisibleItems([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it("returns all items when the count exceeds the list length", () => {
    expect(computeVisibleItems([1, 2], 10)).toEqual([1, 2]);
  });

  it("returns an empty array for a zero or negative count", () => {
    expect(computeVisibleItems([1, 2, 3], 0)).toEqual([]);
    expect(computeVisibleItems([1, 2, 3], -5)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { firstString } from "@/lib/utils/search-params";

describe("firstString", () => {
  it("passes a single string value through unchanged", () => {
    expect(firstString("abc")).toBe("abc");
  });

  it("returns the first value when the param was given multiple times", () => {
    expect(firstString(["first", "second"])).toBe("first");
  });

  it("returns undefined when the param is missing", () => {
    expect(firstString(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty array of values", () => {
    expect(firstString([])).toBeUndefined();
  });

  it("passes an empty string through as-is, not as missing", () => {
    expect(firstString("")).toBe("");
  });
});

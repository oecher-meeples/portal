import { describe, expect, it } from "vitest";
import { helperColorClass } from "./helper-colors";

describe("helperColorClass", () => {
  it("is deterministic for the same meepleId", () => {
    expect(helperColorClass("meeple-1")).toBe(helperColorClass("meeple-1"));
  });

  it("differs for different meepleIds (not guaranteed, but true for these fixtures)", () => {
    expect(helperColorClass("meeple-1")).not.toBe(helperColorClass("meeple-2"));
  });

  it("always returns a theme-aware Tailwind class pair", () => {
    expect(helperColorClass("meeple-1")).toMatch(/^bg-\S+\/15 text-\S+/);
  });
});

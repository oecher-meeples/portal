import { describe, expect, it } from "vitest";
import {
  MAX_UNIT_CHAIN_DEPTH,
  findUnitAncestor,
  unitChainLabel,
} from "./unit-chain";

const UNITS = new Map([
  ["karton", { label: "Karton 3", parentUnitId: "regal" }],
  ["regal", { label: "Regal A", parentUnitId: "raum" }],
  ["raum", { label: "Raum", parentUnitId: null }],
]);

describe("unitChainLabel", () => {
  it("joins the whole chain from the root down to the unit", () => {
    expect(unitChainLabel("karton", UNITS)).toBe("Raum → Regal A → Karton 3");
  });

  it("is empty for an unknown unit", () => {
    expect(unitChainLabel("missing", UNITS)).toBe("");
  });

  it("stops at the depth limit instead of looping on a cycle", () => {
    const cycle = new Map([
      ["a", { label: "A", parentUnitId: "b" }],
      ["b", { label: "B", parentUnitId: "a" }],
    ]);

    expect(unitChainLabel("a", cycle).split(" → ")).toHaveLength(
      MAX_UNIT_CHAIN_DEPTH,
    );
  });
});

describe("findUnitAncestor", () => {
  const parentById = new Map<string, string | null>([
    ["karton", "regal"],
    ["regal", "raum"],
    ["raum", null],
  ]);

  it("matches the unit itself first", () => {
    expect(findUnitAncestor("karton", parentById, () => true)).toBe("karton");
  });

  it("finds the nearest matching ancestor", () => {
    expect(findUnitAncestor("karton", parentById, (id) => id === "raum")).toBe(
      "raum",
    );
  });

  it("returns null when nothing on the way matches", () => {
    expect(findUnitAncestor("karton", parentById, () => false)).toBeNull();
  });
});

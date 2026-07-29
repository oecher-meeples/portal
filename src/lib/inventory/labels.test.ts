import { describe, expect, it } from "vitest";
import { paginateLabels, selectLabels, type LabelUnit } from "./labels";

const UNITS: LabelUnit[] = [
  { id: "1", code: "OM-BOX-0002", label: "Karton 2", kind: "BOX" },
  { id: "2", code: "OM-BOX-0001", label: "Karton 1", kind: "BOX" },
  { id: "3", code: "OM-SHELF-C4", label: "Regal C4", kind: "SHELF" },
];

describe("selectLabels", () => {
  it("returns all units sorted by code", () => {
    expect(selectLabels(UNITS, "all").map((u) => u.code)).toEqual([
      "OM-BOX-0001",
      "OM-BOX-0002",
      "OM-SHELF-C4",
    ]);
  });

  it("filters to only boxes", () => {
    expect(selectLabels(UNITS, "boxes").map((u) => u.id)).toEqual(["2", "1"]);
  });

  it("filters to only shelves", () => {
    expect(selectLabels(UNITS, "shelves").map((u) => u.id)).toEqual(["3"]);
  });

  it("filters to a manual selection regardless of kind", () => {
    expect(
      selectLabels(UNITS, "selected", ["1", "3"]).map((u) => u.id),
    ).toEqual(["1", "3"]);
  });

  it("returns nothing for an empty manual selection", () => {
    expect(selectLabels(UNITS, "selected", [])).toEqual([]);
  });
});

describe("paginateLabels", () => {
  it("splits units into pages of the given size", () => {
    const pages = paginateLabels(UNITS, 2);

    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(2);
    expect(pages[1]).toHaveLength(1);
  });

  it("defaults to 12 per page", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      code: `OM-BOX-${String(i).padStart(4, "0")}`,
      label: `Karton ${i}`,
      kind: "BOX" as const,
    }));

    expect(paginateLabels(many)).toHaveLength(3);
  });

  it("returns an empty array for no units", () => {
    expect(paginateLabels([])).toEqual([]);
  });
});

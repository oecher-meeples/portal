import { describe, expect, it } from "vitest";
import {
  parseScannerMode,
  parseScannerTargetUnit,
  scannerModeHref,
  scannerModesFor,
  toCopyChoices,
} from "./scanner-modes";

describe("scannerModesFor", () => {
  it("hides the games:manage-only modes", () => {
    expect(scannerModesFor(false)).toEqual([
      "einzel",
      "erhalten",
      "uebergeben",
    ]);
    expect(scannerModesFor(true)).toEqual([
      "einzel",
      "erhalten",
      "uebergeben",
      "kontrollieren",
      "markieren",
    ]);
  });
});

describe("parseScannerMode", () => {
  it.each([
    [undefined, false, "einzel"],
    ["erhalten", false, "erhalten"],
    [["erhalten", "einzel"], false, "erhalten"],
    ["quatsch", true, "einzel"],
    ["einzel", false, "einzel"],
    // nicht erlaubt → still Einzel-Scan
    ["kontrollieren", false, "einzel"],
    ["kontrollieren", true, "kontrollieren"],
    ["markieren", false, "einzel"],
    ["markieren", true, "markieren"],
    ["uebergeben", false, "uebergeben"],
  ] as const)("%j (games:manage %s) → %s", (raw, canManage, expected) => {
    expect(
      parseScannerMode(raw as string | string[] | undefined, canManage),
    ).toBe(expected);
  });
});

describe("scannerModeHref", () => {
  it("keeps the Einzel-Scan parameter-free", () => {
    expect(scannerModeHref("einzel")).toBe("/scan");
    expect(scannerModeHref("erhalten")).toBe("/scan?modus=erhalten");
  });

  it("carries the pre-selected target unit only for Übergeben (#539)", () => {
    expect(scannerModeHref("uebergeben", "unit 1")).toBe(
      "/scan?modus=uebergeben&ziel=unit%201",
    );
    expect(scannerModeHref("erhalten", "unit-1")).toBe("/scan?modus=erhalten");
    expect(parseScannerTargetUnit("uebergeben", ["unit-1"])).toBe("unit-1");
    expect(parseScannerTargetUnit("erhalten", "unit-1")).toBeNull();
    expect(parseScannerTargetUnit("uebergeben", undefined)).toBeNull();
  });
});

describe("toCopyChoices", () => {
  it("appends the condition to the title", () => {
    expect(
      toCopyChoices([
        {
          id: "a",
          condition: "leicht bespielt",
          inventoryNumber: 3,
          needsCompletenessCheck: true,
          boardGame: { title: "Catan", slug: "catan" },
        },
        {
          id: "b",
          condition: null,
          inventoryNumber: null,
          needsCompletenessCheck: false,
          boardGame: { title: "Catan", slug: "catan" },
        },
      ]),
    ).toEqual([
      {
        id: "a",
        title: "Catan (leicht bespielt)",
        inventoryNumber: 3,
        boardGameSlug: "catan",
        needsCompletenessCheck: true,
      },
      {
        id: "b",
        title: "Catan",
        inventoryNumber: null,
        boardGameSlug: "catan",
        needsCompletenessCheck: false,
      },
    ]);
  });
});

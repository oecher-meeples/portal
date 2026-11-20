import { describe, expect, it } from "vitest";
import {
  parseScannerMode,
  scannerModeHref,
  scannerModesFor,
  toCopyChoices,
} from "./scanner-modes";

describe("scannerModesFor", () => {
  it("hides the games:manage-only modes", () => {
    expect(scannerModesFor(false)).toEqual(["erhalten", "einzel"]);
    expect(scannerModesFor(true)).toEqual([
      "erhalten",
      "einzel",
      "markieren",
      "kontrollieren",
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

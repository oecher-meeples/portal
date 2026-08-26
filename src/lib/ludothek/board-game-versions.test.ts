import { describe, expect, it } from "vitest";
import {
  selectRelevantVersions,
  resolvePublisherFromVersions,
  resolveProductCodeFromVersions,
} from "./board-game-versions";
import type { BggVersion } from "@/lib/bgg/client";

const ENGLISH_VERSION: BggVersion = {
  yearPublished: 2021,
  publisher: ["Capstone Games"],
  productCode: "CAPS001",
  languages: ["English"],
};

const GERMAN_VERSION: BggVersion = {
  yearPublished: 2022,
  publisher: ["Feuerland Spiele"],
  productCode: "FEU001",
  languages: ["German"],
};

describe("selectRelevantVersions", () => {
  it("returns only the German edition(s) when at least one exists", () => {
    const result = selectRelevantVersions([ENGLISH_VERSION, GERMAN_VERSION]);

    expect(result).toEqual([GERMAN_VERSION]);
  });

  it("returns every version when none is German", () => {
    const result = selectRelevantVersions([ENGLISH_VERSION]);

    expect(result).toEqual([ENGLISH_VERSION]);
  });

  it("matches 'Deutsch' as well as 'German'", () => {
    const version = { ...GERMAN_VERSION, languages: ["Deutsch"] };

    expect(selectRelevantVersions([ENGLISH_VERSION, version])).toEqual([
      version,
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(selectRelevantVersions([])).toEqual([]);
  });
});

describe("resolvePublisherFromVersions", () => {
  it("auto-accepts when the publisher is identical across all relevant versions", () => {
    const result = resolvePublisherFromVersions([
      GERMAN_VERSION,
      { ...GERMAN_VERSION, yearPublished: 2023 },
    ]);

    expect(result).toEqual({
      value: ["Feuerland Spiele"],
      needsSelection: false,
    });
  });

  it("treats publisher order as irrelevant for co-publishers", () => {
    const a = { ...GERMAN_VERSION, publisher: ["A", "B"] };
    const b = { ...GERMAN_VERSION, publisher: ["B", "A"] };

    const result = resolvePublisherFromVersions([a, b]);

    expect(result.needsSelection).toBe(false);
  });

  it("requires selection when publishers differ across versions (#205)", () => {
    const result = resolvePublisherFromVersions([
      GERMAN_VERSION,
      { ...GERMAN_VERSION, publisher: ["Other Verlag"] },
    ]);

    expect(result).toEqual({ value: null, needsSelection: true });
  });

  it("only compares the German editions when both German and non-German versions exist", () => {
    // English version has a different publisher, but it's filtered out —
    // only the (single) German edition remains, so it's unambiguous.
    const result = resolvePublisherFromVersions([
      ENGLISH_VERSION,
      GERMAN_VERSION,
    ]);

    expect(result).toEqual({
      value: ["Feuerland Spiele"],
      needsSelection: false,
    });
  });

  it("returns an empty, non-ambiguous value when there are no versions at all", () => {
    expect(resolvePublisherFromVersions([])).toEqual({
      value: [],
      needsSelection: false,
    });
  });
});

describe("resolveProductCodeFromVersions", () => {
  it("auto-accepts an identical product code", () => {
    const result = resolveProductCodeFromVersions([
      GERMAN_VERSION,
      { ...GERMAN_VERSION, yearPublished: 2023 },
    ]);

    expect(result).toEqual({ value: "FEU001", needsSelection: false });
  });

  it("requires selection when product codes differ", () => {
    const result = resolveProductCodeFromVersions([
      GERMAN_VERSION,
      { ...GERMAN_VERSION, productCode: "FEU002" },
    ]);

    expect(result).toEqual({ value: null, needsSelection: true });
  });

  it("ignores versions with a blank product code instead of treating them as a mismatch", () => {
    const result = resolveProductCodeFromVersions([
      GERMAN_VERSION,
      { ...GERMAN_VERSION, productCode: null },
    ]);

    expect(result).toEqual({ value: "FEU001", needsSelection: false });
  });

  it("returns null, non-ambiguous when no relevant version has a product code", () => {
    const result = resolveProductCodeFromVersions([
      { ...GERMAN_VERSION, productCode: null },
    ]);

    expect(result).toEqual({ value: null, needsSelection: false });
  });
});

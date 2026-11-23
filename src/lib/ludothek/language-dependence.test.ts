import { describe, expect, it } from "vitest";
import { LanguageDependence, RuleBookLanguage } from "@prisma/client";
import {
  LANGUAGE_DEPENDENCE_LABELS,
  LANGUAGE_DEPENDENCE_BY_LEVEL,
  RULE_BOOK_LANGUAGE_LABELS,
  isLanguageIndependent,
  formatRuleBookLanguages,
} from "./language-dependence";

describe("LANGUAGE_DEPENDENCE_LABELS", () => {
  it("has a German label for every level", () => {
    for (const level of Object.values(LanguageDependence)) {
      expect(LANGUAGE_DEPENDENCE_LABELS[level]).toBeTruthy();
    }
  });
});

describe("LANGUAGE_DEPENDENCE_BY_LEVEL", () => {
  it("lists all 5 levels in BGG's poll order", () => {
    expect(LANGUAGE_DEPENDENCE_BY_LEVEL).toEqual([
      LanguageDependence.NO_NECESSARY_TEXT,
      LanguageDependence.SOME_NECESSARY_TEXT,
      LanguageDependence.MODERATE_TEXT,
      LanguageDependence.EXTENSIVE_TEXT,
      LanguageDependence.UNPLAYABLE,
    ]);
  });
});

describe("isLanguageIndependent", () => {
  it("is true only for level 1 (no necessary text)", () => {
    expect(isLanguageIndependent(LanguageDependence.NO_NECESSARY_TEXT)).toBe(
      true,
    );
  });

  it("is false for every other level, even the next-mildest one", () => {
    expect(isLanguageIndependent(LanguageDependence.SOME_NECESSARY_TEXT)).toBe(
      false,
    );
    expect(isLanguageIndependent(LanguageDependence.UNPLAYABLE)).toBe(false);
  });

  it("is false when not yet erfasst", () => {
    expect(isLanguageIndependent(null)).toBe(false);
  });
});

describe("RULE_BOOK_LANGUAGE_LABELS", () => {
  it("has a German label for every language", () => {
    for (const language of Object.values(RuleBookLanguage)) {
      expect(RULE_BOOK_LANGUAGE_LABELS[language]).toBeTruthy();
    }
  });
});

describe("formatRuleBookLanguages", () => {
  it("joins several languages with a comma", () => {
    expect(
      formatRuleBookLanguages([RuleBookLanguage.DE, RuleBookLanguage.EN]),
    ).toBe("DE, EN");
  });

  it("returns an empty string for no languages", () => {
    expect(formatRuleBookLanguages([])).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  CONTRIBUTION_CATEGORY_LABELS,
  determineContribution,
  isMiniMeeple,
  requiresEmail,
} from "./contribution";

const NOW = new Date("2026-07-29T12:00:00Z");

// #452: der erklärende Klammer-Zusatz ("ermäßigter Kinderbeitrag" etc.) ist
// überflüssig und soll nirgends mehr auftauchen.
describe("CONTRIBUTION_CATEGORY_LABELS", () => {
  it("has no explanatory parenthesis, just the plain category name", () => {
    expect(CONTRIBUTION_CATEGORY_LABELS).toEqual({
      mini: "MiniMeeple",
      jung: "JungMeeple",
      meeple: "Meeple",
      individuell: "Individueller Beitrag",
    });
  });
});

describe("determineContribution", () => {
  it("is unbestimmt without a birth date and without a chosen amount", () => {
    expect(
      determineContribution(
        { birthDate: null, selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toEqual({ category: null, amountEuros: null, source: null });
  });

  it("is the ermäßigter Kinderbeitrag (0 €) for a member under 13", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("2014-01-01T00:00:00Z"), // 12 on NOW
          selbstgewaehlterBeitrag: null,
        },
        NOW,
      ),
    ).toEqual({ category: "mini", amountEuros: 0, source: "birthDate" });
  });

  it("treats the 13th birthday itself as JungMeeple, not MiniMeeple", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("2013-07-29T00:00:00Z"), // turns 13 exactly on NOW
          selbstgewaehlterBeitrag: null,
        },
        NOW,
      ),
    ).toEqual({ category: "jung", amountEuros: null, source: "birthDate" });
  });

  it("is JungMeeple for ages 13 to 17", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("2010-01-01T00:00:00Z"),
          selbstgewaehlterBeitrag: null,
        }, // 16
        NOW,
      ),
    ).toEqual({ category: "jung", amountEuros: null, source: "birthDate" });
  });

  it("treats the 18th birthday itself as Meeple, not JungMeeple", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("2008-07-29T00:00:00Z"), // turns 18 exactly on NOW
          selbstgewaehlterBeitrag: null,
        },
        NOW,
      ),
    ).toEqual({ category: "meeple", amountEuros: null, source: "birthDate" });
  });

  it("is Meeple (regulärer Beitrag) for adults, amount unspecified without a chosen value", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("1990-01-01T00:00:00Z"),
          selbstgewaehlterBeitrag: null,
        },
        NOW,
      ),
    ).toEqual({ category: "meeple", amountEuros: null, source: "birthDate" });
  });

  it("lets selbstgewaehlterBeitrag override the age-derived category", () => {
    expect(
      determineContribution(
        {
          birthDate: new Date("2014-01-01T00:00:00Z"), // would be "mini"
          selbstgewaehlterBeitrag: 15,
        },
        NOW,
      ),
    ).toEqual({
      category: "individuell",
      amountEuros: 15,
      source: "selbstgewaehlterBeitrag",
    });
  });

  it("is determined (individuell) from a chosen amount alone, without a birth date", () => {
    expect(
      determineContribution(
        { birthDate: null, selbstgewaehlterBeitrag: 20 },
        NOW,
      ),
    ).toEqual({
      category: "individuell",
      amountEuros: 20,
      source: "selbstgewaehlterBeitrag",
    });
  });
});

describe("isMiniMeeple (#380, #381)", () => {
  it("is true under age 13", () => {
    expect(
      isMiniMeeple(
        { birthDate: new Date("2015-01-01"), selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false at or above age 13", () => {
    expect(
      isMiniMeeple(
        { birthDate: new Date("2010-01-01"), selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false once a chosen amount overrides the age category", () => {
    expect(
      isMiniMeeple(
        { birthDate: new Date("2015-01-01"), selbstgewaehlterBeitrag: 5 },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false without a birth date", () => {
    expect(
      isMiniMeeple({ birthDate: null, selbstgewaehlterBeitrag: null }, NOW),
    ).toBe(false);
  });
});

describe("requiresEmail", () => {
  it("is false for a MiniMeeple (< 13)", () => {
    expect(
      requiresEmail(
        { birthDate: new Date("2014-01-01"), selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false for a JungMeeple (13–17)", () => {
    expect(
      requiresEmail(
        { birthDate: new Date("2011-01-01"), selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true for an adult Meeple (18+)", () => {
    expect(
      requiresEmail(
        { birthDate: new Date("2000-01-01"), selbstgewaehlterBeitrag: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("is true without a birth date (safe default)", () => {
    expect(
      requiresEmail({ birthDate: null, selbstgewaehlterBeitrag: null }, NOW),
    ).toBe(true);
  });

  it("is true once a chosen amount overrides a child's age category", () => {
    expect(
      requiresEmail(
        { birthDate: new Date("2015-01-01"), selbstgewaehlterBeitrag: 5 },
        NOW,
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  INVALID_ACQUIRED_ON_ERROR,
  INVALID_VALUE_CENTS_ERROR,
  acquiredOnToInput,
  formatAcquiredOn,
  formatValueCents,
  parseAcquiredOn,
  parseEuroToCents,
  validateAcquiredOn,
  validateValueCents,
  valueCentsToInput,
} from "./game-copy-acquisition";

describe("parseEuroToCents", () => {
  it.each([
    ["24,99", 2499],
    ["24.99", 2499],
    ["24,9", 2490],
    ["24", 2400],
    ["0", 0],
    ["24,99 €", 2499],
    ["€ 24,99", 2499],
    ["24,99 EUR", 2499],
    ["1.234,50", 123450],
    ["1.234", 123400],
    ["  7,50  ", 750],
  ])("liest %s als %i Cent", (raw, cents) => {
    expect(parseEuroToCents(raw)).toBe(cents);
  });

  it("liefert null für leere Eingaben (Wert unbekannt)", () => {
    expect(parseEuroToCents("")).toBeNull();
    expect(parseEuroToCents("   ")).toBeNull();
    expect(parseEuroToCents("€")).toBeNull();
  });

  it.each(["abc", "24,999", "-5", "12,34,56", "1.23.4"])(
    "liefert NaN für unlesbares %s",
    (raw) => {
      expect(parseEuroToCents(raw)).toBeNaN();
    },
  );
});

describe("validateValueCents", () => {
  it("akzeptiert null, undefined und nicht-negative Ganzzahlen", () => {
    expect(validateValueCents(null)).toBeNull();
    expect(validateValueCents(undefined)).toBeNull();
    expect(validateValueCents(0)).toBeNull();
    expect(validateValueCents(2499)).toBeNull();
  });

  it.each([Number.NaN, -1, 12.5, 2_147_483_648])("lehnt %d ab", (value) => {
    expect(validateValueCents(value)).toBe(INVALID_VALUE_CENTS_ERROR);
  });
});

describe("Wert-Formatierung", () => {
  it("formatiert Cent als Euro-Betrag", () => {
    expect(formatValueCents(2499)).toBe("24,99 €");
    expect(formatValueCents(123450)).toBe("1.234,50 €");
  });

  it("macht aus Cent wieder Formulartext", () => {
    expect(valueCentsToInput(2499)).toBe("24,99");
    expect(valueCentsToInput(2400)).toBe("24,00");
    expect(valueCentsToInput(null)).toBe("");
    expect(valueCentsToInput(undefined)).toBe("");
  });

  it("überlebt den Roundtrip Formular → Cent → Formular", () => {
    expect(parseEuroToCents(valueCentsToInput(123450))).toBe(123450);
  });
});

describe("parseAcquiredOn", () => {
  it("liest JJJJ-MM-TT als UTC-Mitternacht", () => {
    expect(parseAcquiredOn("2024-03-05")?.toISOString()).toBe(
      "2024-03-05T00:00:00.000Z",
    );
  });

  it("liefert null für leere Eingaben", () => {
    expect(parseAcquiredOn("")).toBeNull();
    expect(parseAcquiredOn("  ")).toBeNull();
  });

  it.each(["05.03.2024", "2024-02-30", "gestern"])(
    "liefert ein ungültiges Datum für %s",
    (raw) => {
      expect(Number.isNaN(parseAcquiredOn(raw)!.getTime())).toBe(true);
    },
  );
});

describe("validateAcquiredOn", () => {
  const now = new Date("2026-11-24T12:00:00.000Z");

  it("akzeptiert null, undefined und Daten bis heute", () => {
    expect(validateAcquiredOn(null, now)).toBeNull();
    expect(validateAcquiredOn(undefined, now)).toBeNull();
    expect(validateAcquiredOn(parseAcquiredOn("2026-11-24"), now)).toBeNull();
  });

  it("lehnt ungültige Daten ab", () => {
    expect(validateAcquiredOn(new Date(Number.NaN), now)).toBe(
      INVALID_ACQUIRED_ON_ERROR,
    );
  });

  it("lehnt Daten in der Zukunft ab", () => {
    expect(validateAcquiredOn(parseAcquiredOn("2026-11-25"), now)).toBe(
      "„Erhalten am“ darf nicht in der Zukunft liegen.",
    );
  });
});

describe("Datums-Formatierung", () => {
  it("macht aus einem Datum Formulartext und zeigt es deutsch an", () => {
    const date = parseAcquiredOn("2024-03-05")!;
    expect(acquiredOnToInput(date)).toBe("2024-03-05");
    expect(acquiredOnToInput(null)).toBe("");
    expect(formatAcquiredOn("2024-03-05")).toBe("05.03.2024");
  });
});

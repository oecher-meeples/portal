import { describe, expect, it } from "vitest";
import {
  classifyState,
  locationKind,
  normalizeLocation,
  normalizeSheetRow,
  parseReleaseInventory,
  parseSheetDate,
  serializeReleaseInventory,
} from "./release-inventory";

const sheetRow = (...cells: string[]) => cells;

describe("parseSheetDate", () => {
  it("converts dd.mm.yyyy to ISO", () => {
    expect(parseSheetDate("16.08.2025")).toBe("2025-08-16");
  });

  it("treats empty as no date", () => {
    expect(parseSheetDate("  ")).toBeNull();
  });

  it.each(["29.07", "2026-11-05", "24-2-26"])("rejects %s", (value) => {
    expect(() => parseSheetDate(value)).toThrow(/Datumsformat/);
  });
});

describe("normalizeLocation", () => {
  it.each([
    ["A", "Regal A"],
    ["w", "Regal W"],
    ["Kiste 3", "Kiste 3"],
    ["KInder", "Kinder"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeLocation(input)).toBe(expected);
  });

  it.each(["", "???", "Klask", "Ellen Bücherei"])("%s → Unsortiert", (v) => {
    expect(normalizeLocation(v)).toBeNull();
  });

  it("derives the unit kind", () => {
    expect(locationKind("Kiste 1")).toBe("BOX");
    expect(locationKind("Regal A")).toBe("SHELF");
    expect(locationKind("Kinder")).toBe("SHELF");
  });
});

describe("classifyState", () => {
  it("maps vollständig to COMPLETE", () => {
    expect(classifyState("vollständig", "incl. Promo")).toEqual({
      result: "COMPLETE",
      note: "incl. Promo",
    });
  });

  it("downgrades vollständig with a missing part to INCOMPLETE", () => {
    expect(classifyState("vollständig", "es fehlt ein roter Chip").result).toBe(
      "INCOMPLETE",
    );
  });

  it("prefixes a restricted spielbar variant to the note", () => {
    expect(
      classifyState("nur zu 5/6 spielbar", "es fehlt ein blauer Partnerchip"),
    ).toEqual({
      result: "INCOMPLETE",
      note: "nur zu 5/6 spielbar – es fehlt ein blauer Partnerchip",
    });
  });

  it("keeps plain spielbar without a prefix", () => {
    expect(classifyState("spielbar", "ein Elch fehlt").note).toBe(
      "ein Elch fehlt",
    );
  });

  it("maps unspielbar to UNPLAYABLE", () => {
    expect(classifyState("unspielbar", null).result).toBe("UNPLAYABLE");
  });

  it.each(["", "nicht geprüft", "nicht geprüfr"])("%s → no check", (state) => {
    expect(classifyState(state, "x").result).toBeNull();
  });

  it("throws on unknown states", () => {
    expect(() => classifyState("kaputt", null)).toThrow(/Unbekannter Zustand/);
  });
});

describe("normalizeSheetRow", () => {
  it("drops personal and value columns", () => {
    const row = normalizeSheetRow(
      sheetRow(
        "070",
        "6 nimmt!",
        "06.08.2026",
        "vollständig",
        "",
        "Kiste 4",
        "Max Mustermann",
        "29.07",
        "",
        "12,00 €",
        "06.08.2026",
      ),
    );
    expect(row).toEqual({
      inventoryNumber: 70,
      title: "6 nimmt!",
      bggId: null,
      bggMatch: null,
      location: "Kiste 4",
      lastCheckedOn: "2026-08-06",
      result: "COMPLETE",
      note: null,
      englishRules: false,
      deinventarised: false,
      valueCents: 1200,
    });
    expect(JSON.stringify(row)).not.toContain("Mustermann");
  });

  it("reads the value and drops unreadable or shifted entries (#615)", () => {
    const value = (cell: string) =>
      normalizeSheetRow(sheetRow("1", "X", "", "", "", "A", "", "", "", cell))
        ?.valueCents;
    expect(value("1.234,50 €")).toBe(123450);
    expect(value("- €")).toBeNull();
    expect(value("29.07.2026")).toBeNull();
    expect(value("")).toBeNull();
    // Verrutschte Zeile: Wert eine Spalte zu früh, Datum unter „Wert".
    expect(
      normalizeSheetRow(
        sheetRow("781", "X", "", "", "", "A", "", "", "33,99 €", "29.07.2026"),
      )?.valueCents,
    ).toBe(3399);
  });

  it("returns null for rows without a number", () => {
    expect(normalizeSheetRow(sheetRow("", "", "", "", "c"))).toBeNull();
  });

  it("detects deinventarised (incl. typo) and strips it from the note", () => {
    const row = normalizeSheetRow(
      sheetRow(
        "420",
        "Colorio",
        "16.08.2025",
        "vollständig",
        "deinentarisiert",
        "C",
      ),
    );
    expect(row?.deinventarised).toBe(true);
    expect(row?.note).toBeNull();
  });

  it("moves a shifted state back out of the remark column", () => {
    const row = normalizeSheetRow(
      sheetRow("414", "City of Rome", "", "", "vollständig", "", "???"),
    );
    expect(row).toMatchObject({ result: null, note: null, location: null });
  });

  it("skips the check without a date but keeps the note", () => {
    const row = normalizeSheetRow(
      sheetRow("079", "Ohne Furcht und Adel", "", "", "fehlt: 1x Standfuss"),
    );
    expect(row).toMatchObject({ result: null, note: "fehlt: 1x Standfuss" });
  });

  it("strips an English suffix and flags the rule book", () => {
    const row = normalizeSheetRow(
      sheetRow(
        "030",
        "Guildlands (engl.)",
        "13.06.2026",
        "vollständig",
        "",
        "G",
      ),
    );
    expect(row).toMatchObject({ title: "Guildlands", englishRules: true });
  });

  it("trims dangling separators from remarks", () => {
    const row = normalizeSheetRow(
      sheetRow(
        "198",
        "Pixies",
        "13.06.2026",
        "spielbar",
        "Anleitung fehlt, ",
        "Kiste 3",
      ),
    );
    expect(row?.note).toBe("Anleitung fehlt");
  });

  it("rejects a non-numeric number", () => {
    expect(() => normalizeSheetRow(sheetRow("A1", "x"))).toThrow(/Nr/);
  });
});

describe("release-inventory.csv round trip", () => {
  it("serializes and parses back unchanged", () => {
    const rows = [
      normalizeSheetRow(
        sheetRow(
          "013",
          "Geister, Geister",
          "06.08.2026",
          "spielbar",
          'zwei "Geister" fehlen',
          "Kinder",
        ),
      )!,
      {
        ...normalizeSheetRow(sheetRow("797", "Safe House", "", "", "", "F"))!,
        inventoryNumber: null,
        bggId: 123,
        bggMatch: "picked" as const,
        valueCents: 2499,
      },
    ];
    expect(parseReleaseInventory(serializeReleaseInventory(rows))).toEqual(
      rows,
    );
  });

  it("rejects a result without a date", () => {
    const csv =
      "inventoryNumber,title,bggId,bggMatch,location,lastCheckedOn,result,note,englishRules,deinventarised,valueCents\n1,X,,,,,COMPLETE,,,,\n";
    expect(() => parseReleaseInventory(csv)).toThrow(/ohne Datum/);
  });

  it("rejects an unexpected header", () => {
    expect(() => parseReleaseInventory("Nr,Titel\n1,X\n")).toThrow(/Kopfzeile/);
  });
});

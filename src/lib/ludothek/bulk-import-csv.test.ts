import { describe, expect, it } from "vitest";
import { parseBulkImportCsv } from "./bulk-import-csv";

describe("parseBulkImportCsv", () => {
  it("parses a single-column list of titles without a header", () => {
    expect(parseBulkImportCsv("Arche Nova\nWingspan\nCatan")).toEqual([
      "Arche Nova",
      "Wingspan",
      "Catan",
    ]);
  });

  it("parses a single-column list of EANs without a header", () => {
    expect(parseBulkImportCsv("4001504311896\n4260402312019")).toEqual([
      "4001504311896",
      "4260402312019",
    ]);
  });

  it("detects and skips a Titel/EAN header row", () => {
    const csv = "Titel,EAN\nArche Nova,4001504311896\nWingspan,4260402312019";
    expect(parseBulkImportCsv(csv)).toEqual([
      "Arche Nova",
      "4001504311896",
      "Wingspan",
      "4260402312019",
    ]);
  });

  it("detects a semicolon-delimited header row (German Excel export)", () => {
    const csv = "Titel;EAN\r\nArche Nova;4001504311896";
    expect(parseBulkImportCsv(csv)).toEqual(["Arche Nova", "4001504311896"]);
  });

  it("treats the first row as data when it doesn't look like a header", () => {
    const csv = "Arche Nova,4001504311896\nWingspan,4260402312019";
    expect(parseBulkImportCsv(csv)).toEqual([
      "Arche Nova",
      "4001504311896",
      "Wingspan",
      "4260402312019",
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    expect(parseBulkImportCsv("Arche Nova \n\n Wingspan\n")).toEqual([
      "Arche Nova",
      "Wingspan",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseBulkImportCsv("")).toEqual([]);
  });

  describe("joinCellsWith (#289)", () => {
    it("joins each row's cells with the given delimiter instead of flattening them", () => {
      const csv =
        "Inventarnummer,EAN\nOM-0142,4001504311896\nOM-0143,4260402312019";
      expect(parseBulkImportCsv(csv, ";")).toEqual([
        "OM-0142;4001504311896",
        "OM-0143;4260402312019",
      ]);
    });

    it("leaves a single-column row as a plain entry without the delimiter", () => {
      expect(parseBulkImportCsv("Arche Nova\nWingspan", ";")).toEqual([
        "Arche Nova",
        "Wingspan",
      ]);
    });

    it("drops empty cells before joining", () => {
      const csv = "OM-0142,,4001504311896";
      expect(parseBulkImportCsv(csv, ";")).toEqual(["OM-0142;4001504311896"]);
    });
  });
});

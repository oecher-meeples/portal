import { describe, expect, it } from "vitest";
import { detectCsvDelimiter, escapeCsvField, parseCsvRows } from "./csv";

describe("escapeCsvField", () => {
  it("returns a plain value unchanged", () => {
    expect(escapeCsvField("Arche Nova", ",")).toBe("Arche Nova");
  });

  it("quotes a value containing the delimiter", () => {
    expect(escapeCsvField("Arche Nova, Deluxe", ",")).toBe(
      '"Arche Nova, Deluxe"',
    );
  });

  it("does not quote a value containing a different delimiter", () => {
    expect(escapeCsvField("Arche Nova, Deluxe", ";")).toBe(
      "Arche Nova, Deluxe",
    );
  });

  it("quotes and doubles inner double quotes", () => {
    expect(escapeCsvField('12" Figur', ",")).toBe('"12"" Figur"');
  });

  it("quotes a value containing a newline", () => {
    expect(escapeCsvField("Zeile 1\nZeile 2", ",")).toBe('"Zeile 1\nZeile 2"');
  });

  it("stringifies numbers", () => {
    expect(escapeCsvField(42, ",")).toBe("42");
  });
});

describe("detectCsvDelimiter", () => {
  it("detects a semicolon-delimited file", () => {
    expect(detectCsvDelimiter("Titel;EAN\nArche Nova;123")).toBe(";");
  });

  it("defaults to comma", () => {
    expect(detectCsvDelimiter("Titel,EAN\nArche Nova,123")).toBe(",");
  });

  it("defaults to comma for a single column without any delimiter", () => {
    expect(detectCsvDelimiter("Arche Nova\nWingspan")).toBe(",");
  });
});

describe("parseCsvRows", () => {
  it("splits plain rows on the delimiter", () => {
    expect(parseCsvRows("Titel,EAN\nArche Nova,123", ",")).toEqual([
      ["Titel", "EAN"],
      ["Arche Nova", "123"],
    ]);
  });

  it("handles quoted fields containing the delimiter", () => {
    expect(parseCsvRows('"Arche Nova, Deluxe",123', ",")).toEqual([
      ["Arche Nova, Deluxe", "123"],
    ]);
  });

  it("unescapes doubled inner quotes", () => {
    expect(parseCsvRows('"12"" Figur",123', ",")).toEqual([
      ['12" Figur', "123"],
    ]);
  });

  it("handles a quoted field containing a newline", () => {
    expect(parseCsvRows('"Zeile 1\nZeile 2",123', ",")).toEqual([
      ["Zeile 1\nZeile 2", "123"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsvRows("Arche Nova,123\r\nWingspan,456", ",")).toEqual([
      ["Arche Nova", "123"],
      ["Wingspan", "456"],
    ]);
  });

  it("drops a trailing blank line from a file ending in a newline", () => {
    expect(parseCsvRows("Arche Nova\nWingspan\n", ",")).toEqual([
      ["Arche Nova"],
      ["Wingspan"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsvRows("", ",")).toEqual([]);
  });
});

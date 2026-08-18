import { describe, expect, it } from "vitest";
import { escapeCsvField } from "./csv";

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

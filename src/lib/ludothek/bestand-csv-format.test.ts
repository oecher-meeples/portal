import { describe, expect, it } from "vitest";
import { BESTAND_CSV_COLUMNS, buildBestandCsv } from "./bestand-csv-format";

describe("buildBestandCsv", () => {
  it("contains exactly the five defined columns", () => {
    const csv = buildBestandCsv([]);
    expect(csv).toBe(BESTAND_CSV_COLUMNS.join(";"));
    expect(BESTAND_CSV_COLUMNS).toHaveLength(5);
  });

  it("escapes fields containing the delimiter and falls back for a missing EAN", () => {
    const csv = buildBestandCsv([
      {
        title: "Feuerland; Sonderedition",
        ean: null,
        status: "ACTIVE",
        zustand: "gut",
        locationChain: "Regal 1",
      },
    ]);
    const lines = csv.split("\r\n");

    expect(lines[1]).toBe('"Feuerland; Sonderedition";;ACTIVE;gut;Regal 1');
  });
});

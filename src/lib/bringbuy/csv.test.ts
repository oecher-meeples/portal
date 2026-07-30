import { describe, expect, it } from "vitest";
import { parseFleaMarketCsv } from "./csv";

describe("parseFleaMarketCsv", () => {
  it("parses valid rows with a description", () => {
    const raw = "title,price,description\nWingspan,28,Tolles Kennerspiel\n";

    const result = parseFleaMarketCsv(raw);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      { title: "Wingspan", priceEuros: 28, description: "Tolles Kennerspiel" },
    ]);
  });

  it("parses valid rows without a description", () => {
    const raw = "title,price,description\nAzul,22\n";

    const result = parseFleaMarketCsv(raw);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      { title: "Azul", priceEuros: 22, description: undefined },
    ]);
  });

  it("collects a bad price row as an error without aborting the rest", () => {
    const raw = "title,price,description\nSplendor,zehn\nAzul,22\n";

    const result = parseFleaMarketCsv(raw);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.items).toEqual([
      { title: "Azul", priceEuros: 22, description: undefined },
    ]);
  });

  it("returns an empty, error-free list for an empty file", () => {
    expect(parseFleaMarketCsv("")).toEqual({ items: [], errors: [] });
  });

  it("returns an empty, error-free list for a header-only file", () => {
    expect(parseFleaMarketCsv("title,price,description\n")).toEqual({
      items: [],
      errors: [],
    });
  });

  it("is robust to windows line endings and a trailing blank line", () => {
    const raw = "title,price,description\r\nAzul,22\r\n\r\n";

    const result = parseFleaMarketCsv(raw);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      { title: "Azul", priceEuros: 22, description: undefined },
    ]);
  });

  it("honours quoted fields containing a comma", () => {
    const raw =
      'title,price,description\n"Catan, Seefahrer",30,"Mit Erweiterung, komplett"\n';

    const result = parseFleaMarketCsv(raw);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      {
        title: "Catan, Seefahrer",
        priceEuros: 30,
        description: "Mit Erweiterung, komplett",
      },
    ]);
  });

  it("rejects a mismatched header as a whole-file error", () => {
    const result = parseFleaMarketCsv("name,cost\nAzul,22\n");

    expect(result.items).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});

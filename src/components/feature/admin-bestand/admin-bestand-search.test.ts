import { describe, expect, it } from "vitest";
import { matchesAdminBestandSearch } from "./admin-bestand-search";

const game = { title: "Catan", ean: "4001504311892", bggId: 13 };

describe("matchesAdminBestandSearch", () => {
  it("matches on a title substring, case-insensitively", () => {
    expect(matchesAdminBestandSearch(game, "cat")).toBe(true);
    expect(matchesAdminBestandSearch(game, "CATAN")).toBe(true);
  });

  it("matches on an exact EAN", () => {
    expect(matchesAdminBestandSearch(game, "4001504311892")).toBe(true);
  });

  it("does not match on a partial EAN", () => {
    expect(matchesAdminBestandSearch(game, "400150431")).toBe(false);
  });

  it("matches on an exact BGG-ID", () => {
    expect(matchesAdminBestandSearch(game, "13")).toBe(true);
  });

  it("does not match when nothing lines up", () => {
    expect(matchesAdminBestandSearch(game, "carcassonne")).toBe(false);
  });

  it("returns true for an empty search term", () => {
    expect(matchesAdminBestandSearch(game, "")).toBe(true);
  });

  it("does not match a numeric search against a null EAN/BGG-ID", () => {
    expect(
      matchesAdminBestandSearch(
        { title: "Catan", ean: null, bggId: null },
        "13",
      ),
    ).toBe(false);
  });
});

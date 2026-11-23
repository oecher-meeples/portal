import { describe, expect, it } from "vitest";
import { extractBggIdFromLink, parseBggId } from "./bgg-id";

describe("parseBggId", () => {
  it("parses a valid numeric id", () => {
    expect(parseBggId("342942")).toBe(342942);
  });

  it("trims surrounding whitespace", () => {
    expect(parseBggId("  1  ")).toBe(1);
  });

  it("rejects an empty string", () => {
    expect(parseBggId("")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseBggId("abc")).toBeNull();
  });

  it("rejects decimals", () => {
    expect(parseBggId("3.5")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parseBggId("-5")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseBggId("0")).toBeNull();
  });
});

describe("extractBggIdFromLink", () => {
  it("extracts the id from a boardgame link", () => {
    expect(
      extractBggIdFromLink(
        "https://boardgamegeek.com/boardgame/342942/ark-nova",
      ),
    ).toBe(342942);
  });

  it("extracts the id from a boardgameexpansion link", () => {
    expect(
      extractBggIdFromLink(
        "https://boardgamegeek.com/boardgameexpansion/123456/ark-nova-marshlands",
      ),
    ).toBe(123456);
  });

  it("handles www-prefixed and trimmed input", () => {
    expect(
      extractBggIdFromLink("  https://www.boardgamegeek.com/boardgame/1  "),
    ).toBe(1);
  });

  it("returns null for a plain title", () => {
    expect(extractBggIdFromLink("Ark Nova")).toBeNull();
  });

  it("returns null for a plain numeric id (not a link)", () => {
    expect(extractBggIdFromLink("342942")).toBeNull();
  });

  it("returns null for an unrelated URL", () => {
    expect(extractBggIdFromLink("https://example.com/boardgame/1")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { BoardGameTrait } from "@prisma/client";
import { parseTraits } from "./traits";

describe("parseTraits", () => {
  it("returns an empty array without any links", () => {
    expect(parseTraits(undefined)).toEqual([]);
  });

  it("ignores non-family links and unwhitelisted family ids", () => {
    const traits = parseTraits([
      { type: "boardgamemechanic", id: "2082" },
      { type: "boardgamefamily", id: "9981" },
    ]);

    expect(traits).toEqual([]);
  });

  it("maps every whitelisted family id to its trait", () => {
    const traits = parseTraits([
      { type: "boardgamefamily", id: "25404" },
      { type: "boardgamefamily", id: "24281" },
      { type: "boardgamefamily", id: "72224" },
      { type: "boardgamefamily", id: "41489" },
    ]);

    expect(traits).toEqual(
      expect.arrayContaining([
        BoardGameTrait.LEGACY,
        BoardGameTrait.CAMPAIGN,
        BoardGameTrait.LIMITED_REPLAYABILITY,
        BoardGameTrait.DIGITAL_HYBRID,
      ]),
    );
    expect(traits).toHaveLength(4);
  });

  it("dedupes when both solitaire families are present", () => {
    const traits = parseTraits([
      { type: "boardgamefamily", id: "5666" },
      { type: "boardgamefamily", id: "61977" },
    ]);

    expect(traits).toEqual([BoardGameTrait.SOLITAIRE_SUPPORTED]);
  });
});

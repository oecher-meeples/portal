import { describe, expect, it } from "vitest";
import { BoardGameKind, LanguageDependence } from "@prisma/client";
import { compareBoardGameWithBgg } from "./board-game-bgg-compare";
import type { BggGameData } from "@/lib/bgg/client";

const EMPTY_FORM = {
  title: "",
  kind: BoardGameKind.BOARDGAME,
  minPlayers: "",
  maxPlayers: "",
  playTimeMinutes: "",
  weight: "",
  imageUrl: "",
  description: "",
  mechanics: "",
  languageDependence: null,
};

const BGG_DATA: BggGameData = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: ["Kartenspiel", "Engine-Building"],
  kind: BoardGameKind.BOARDGAME,
  languageDependence: LanguageDependence.MODERATE_TEXT,
  alternateNames: [],
  explainerVideoUrl: null,
  germanExplainerVideos: [],
  englishExplainerVideos: [],
};

const MATCHING_FORM = {
  ...EMPTY_FORM,
  title: "Ark Nova",
  minPlayers: "1",
  maxPlayers: "4",
  playTimeMinutes: "150",
  weight: "3.7",
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: "Kartenspiel, Engine-Building",
  languageDependence: LanguageDependence.MODERATE_TEXT,
};

describe("compareBoardGameWithBgg", () => {
  it("marks every comparable field as matching when values are identical", () => {
    expect(compareBoardGameWithBgg(MATCHING_FORM, BGG_DATA)).toEqual({
      title: true,
      kind: true,
      minPlayers: true,
      maxPlayers: true,
      playTimeMinutes: true,
      weight: true,
      imageUrl: true,
      description: true,
      mechanics: true,
      languageDependence: true,
    });
  });

  it("marks a field as a mismatch when the value differs", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, title: "Ark Nova (alte Auflage)" },
      BGG_DATA,
    );

    expect(result.title).toBe(false);
  });

  it("treats mechanics as matching regardless of order (#189)", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, mechanics: "Engine-Building, Kartenspiel" },
      BGG_DATA,
    );

    expect(result.mechanics).toBe(true);
  });

  it("marks numeric fields as mismatching when BGG has no value but the form does", () => {
    const result = compareBoardGameWithBgg(MATCHING_FORM, {
      ...BGG_DATA,
      minPlayers: null,
    });

    expect(result.minPlayers).toBe(false);
  });

  it("marks numeric fields as matching when both are unset", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, minPlayers: "" },
      { ...BGG_DATA, minPlayers: null },
    );

    expect(result.minPlayers).toBe(true);
  });

  it("treats a blank description the same as null", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, description: "" },
      { ...BGG_DATA, description: null },
    );

    expect(result.description).toBe(true);
  });

  it("marks kind as a mismatch when the form disagrees with BGG's type attribute (#202)", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, kind: BoardGameKind.BOARDGAME_EXPANSION },
      BGG_DATA,
    );

    expect(result.kind).toBe(false);
  });

  it("marks languageDependence as a mismatch when the form disagrees with BGG's poll result (#188)", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, languageDependence: LanguageDependence.UNPLAYABLE },
      BGG_DATA,
    );

    expect(result.languageDependence).toBe(false);
  });

  it("marks languageDependence as matching when both are unset", () => {
    const result = compareBoardGameWithBgg(
      { ...MATCHING_FORM, languageDependence: null },
      { ...BGG_DATA, languageDependence: null },
    );

    expect(result.languageDependence).toBe(true);
  });
});

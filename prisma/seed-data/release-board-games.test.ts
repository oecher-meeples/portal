import { describe, expect, it } from "vitest";
import type { BggGameData, BggVersion } from "../../src/lib/bgg/client";
import {
  pickBestCandidate,
  normalizeTitle,
  pickGermanVersion,
  scoreCandidate,
  releaseTitleInput,
  type ReleaseBoardGame,
} from "./release-board-games";

const game = (overrides: Partial<ReleaseBoardGame> = {}): ReleaseBoardGame => ({
  input: {
    title: "Ticket to Ride",
    bggId: 9209,
    minPlayers: 2,
    maxPlayers: 5,
    description: "English text",
  },
  alternateNames: ["Zug um Zug", "Les Aventuriers du Rail"],
  version: null,
  versionPick: "none",
  ...overrides,
});

describe("releaseTitleInput", () => {
  it("keeps the club's title when BGG knows it and makes the primary name secondary", () => {
    expect(releaseTitleInput("zug um zug", game())).toMatchObject({
      title: "Zug um Zug",
      secondaryTitle: "Ticket to Ride",
      minPlayers: 2,
      bggId: 9209,
    });
  });

  it("uses the BGG primary name when the club title is unknown to BGG", () => {
    expect(releaseTitleInput("Tiket tu Raid", game())).toMatchObject({
      title: "Ticket to Ride",
      secondaryTitle: null,
    });
  });

  it("prefers the German description and falls back to English", () => {
    expect(releaseTitleInput("Zug um Zug", game()).description).toBe(
      "English text",
    );
    expect(releaseTitleInput("Zug um Zug", game(), "Deutsch").description).toBe(
      "Deutsch",
    );
  });

  it("matches titles regardless of punctuation and leading articles", () => {
    expect(
      releaseTitleInput(
        "Quacksalber von Quedlinburg",
        game({ alternateNames: ["Die Quacksalber von Quedlinburg"] }),
      ).title,
    ).toBe("Die Quacksalber von Quedlinburg");
    expect(normalizeTitle("Shadows: Amsterdam")).toBe(
      normalizeTitle("Shadows Amsterdam"),
    );
  });
});

describe("pickBestCandidate", () => {
  const candidate = (
    bggId: number,
    score: number,
    usersRated: number | null,
    yearPublished: number | null,
  ) => ({
    bggId,
    score,
    data: { usersRated, yearPublished } as BggGameData,
  });

  it("prefers the higher score, then the better-known title, then the older one", () => {
    expect(
      pickBestCandidate([candidate(1, 5, 10, 1990), candidate(2, 6, 1, 2020)])
        ?.bggId,
    ).toBe(2);
    expect(
      pickBestCandidate([
        candidate(1862, 6, 40, 1990),
        candidate(128882, 6, 90000, 2012),
      ])?.bggId,
    ).toBe(128882);
    expect(
      pickBestCandidate([candidate(5, 6, 10, 2001), candidate(7, 6, 10, 1999)])
        ?.bggId,
    ).toBe(7);
  });

  it("returns undefined without candidates", () => {
    expect(pickBestCandidate([])).toBeUndefined();
  });
});

const version = (overrides: Partial<BggVersion>): BggVersion => ({
  bggVersionId: 1,
  name: null,
  yearPublished: null,
  publisher: [],
  publisherLinks: [],
  productCode: null,
  languages: [],
  ...overrides,
});

describe("pickGermanVersion", () => {
  it("returns none without a German edition", () => {
    expect(
      pickGermanVersion([version({ languages: ["English"] })], "X"),
    ).toEqual({ version: null, pick: "none" });
  });

  it("detects a German edition by publisher when BGG has no language link", () => {
    const result = pickGermanVersion(
      [
        version({ bggVersionId: 1, languages: ["English"] }),
        version({ bggVersionId: 2, publisher: ["Feuerland Spiele"] }),
      ],
      "Terra Mystica",
    );
    expect(result.pick).toBe("single");
    expect(result.version?.bggVersionId).toBe(2);
  });

  it("prefers the German edition named like the club title, else the newest", () => {
    const versions = [
      version({
        bggVersionId: 1,
        name: "German edition",
        languages: ["German"],
        yearPublished: 2015,
      }),
      version({
        bggVersionId: 2,
        name: "Zug um Zug Deutschland",
        languages: ["German"],
        yearPublished: 2012,
      }),
      version({
        bggVersionId: 3,
        name: "German reprint",
        languages: ["German"],
        yearPublished: 2021,
      }),
    ];
    expect(pickGermanVersion(versions, "Zug um Zug Deutschland")).toMatchObject(
      {
        pick: "title",
        version: { bggVersionId: 2 },
      },
    );
    expect(pickGermanVersion(versions, "Ticket")).toMatchObject({
      pick: "latest",
      version: { bggVersionId: 3 },
    });
  });
});

describe("scoreCandidate", () => {
  const data = (overrides: Partial<BggGameData>) =>
    ({
      title: "Cascadia",
      alternateNames: [],
      versions: [],
      kind: "BOARDGAME",
      ...overrides,
    }) as BggGameData;

  it("ranks a German edition above a mere name match", () => {
    const german = data({
      title: "Other",
      versions: [version({ publisher: ["Kosmos"] })],
    });
    const named = data({ title: "Cascadia" });
    expect(scoreCandidate("Cascadia", german)).toBeGreaterThan(
      scoreCandidate("Cascadia", named),
    );
  });

  it("prefers base games unless the club title names an expansion", () => {
    const base = data({});
    const expansion = data({ kind: "BOARDGAME_EXPANSION" });
    expect(scoreCandidate("Cascadia", base)).toBeGreaterThan(
      scoreCandidate("Cascadia", expansion),
    );
    expect(scoreCandidate("Cascadia Erweiterung", expansion)).toBeGreaterThan(
      scoreCandidate("Cascadia Erweiterung", base),
    );
  });
});

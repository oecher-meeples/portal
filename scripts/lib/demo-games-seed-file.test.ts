import { describe, expect, it } from "vitest";
import type { BggVersion } from "../../src/lib/bgg/client";
import { pickDemoVersion } from "./demo-games-seed-file";

function version(
  bggVersionId: number,
  publisherIds: number[],
  languages: string[],
  yearPublished: number | null = null,
): BggVersion {
  return {
    bggVersionId,
    name: `Version ${bggVersionId}`,
    yearPublished,
    publisher: [],
    productCode: null,
    languages,
    publisherLinks: publisherIds.map((bggId) => ({ bggId, name: `P${bggId}` })),
  };
}

describe("pickDemoVersion", () => {
  it("picks the version whose publishers match, German first", () => {
    const versions = [
      version(1, [10], ["English"]),
      version(2, [10], ["German"]),
      version(3, [20], ["German"]),
    ];

    expect(pickDemoVersion(versions, [10])?.bggVersionId).toBe(2);
  });

  it("takes the oldest of several matching versions", () => {
    const versions = [
      version(5, [10], ["German"], 2023),
      version(4, [10], ["German"], 2019),
    ];

    expect(pickDemoVersion(versions, [10])?.bggVersionId).toBe(4);
  });

  it("picks the oldest German version when the demo game has no publisher", () => {
    const versions = [
      version(1, [10], ["English"], 2015),
      version(2, [20], ["German"], 2018),
      version(3, [30], ["German"], 2016),
    ];

    expect(pickDemoVersion(versions, [])?.bggVersionId).toBe(3);
  });

  it("returns null without a matching version", () => {
    expect(pickDemoVersion([version(1, [10], ["German"])], [99])).toBeNull();
    expect(pickDemoVersion([], [])).toBeNull();
  });
});

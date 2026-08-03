import { describe, expect, it } from "vitest";
import { DEMO_GAMES } from "./demo-games";
import { DEMO_EXPANSIONS } from "./demo-expansions";
import { DEMO_PRIVATE_COLLECTION_POOL } from "./demo-private-collection";

describe("DEMO_PRIVATE_COLLECTION_POOL", () => {
  it("has exactly 60 titles", () => {
    expect(DEMO_PRIVATE_COLLECTION_POOL).toHaveLength(60);
  });

  it("shares no title with DEMO_GAMES or DEMO_EXPANSIONS", () => {
    const clubTitles = new Set([
      ...DEMO_GAMES.map((g) => g.title),
      ...DEMO_EXPANSIONS.map((e) => e.expansion),
    ]);

    const overlap = DEMO_PRIVATE_COLLECTION_POOL.filter((entry) =>
      clubTitles.has(entry.title),
    );

    expect(overlap).toEqual([]);
  });

  it("has unique titles and unique bggIds within the pool itself", () => {
    const titles = DEMO_PRIVATE_COLLECTION_POOL.map((g) => g.title);
    const bggIds = DEMO_PRIVATE_COLLECTION_POOL.map((g) => g.bggId);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(bggIds).size).toBe(bggIds.length);
  });
});

import { describe, expect, it } from "vitest";
import { groupGamesByTitle } from "@/lib/ludothek/title-grouping";
import type { GameZustand } from "@/lib/ludothek/holdings";

type Copy = { id: string; boardGameId: string; zustand?: GameZustand };

function copy(overrides: Partial<Copy> = {}): Copy {
  return {
    id: "copy-1",
    boardGameId: "title-1",
    zustand: "frei",
    ...overrides,
  };
}

describe("groupGamesByTitle", () => {
  it("keeps a single-copy title as one row with copyCount 1", () => {
    const [row] = groupGamesByTitle([copy()]);

    expect(row.copyCount).toBe(1);
    expect(row.copyIds).toEqual(["copy-1"]);
  });

  it("folds several copies of the same title into one row", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1" }),
      copy({ id: "copy-2" }),
      copy({ id: "copy-3" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].copyCount).toBe(3);
    expect(rows[0].copyIds).toEqual(["copy-1", "copy-2", "copy-3"]);
  });

  it("keeps titles separate", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", boardGameId: "title-1" }),
      copy({ id: "copy-2", boardGameId: "title-2" }),
    ]);

    expect(rows).toHaveLength(2);
  });

  it("picks the best zustand by priority: frei > ausgeliehen > wartung > nicht-erfasst", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", zustand: "wartung" }),
      copy({ id: "copy-2", zustand: "frei" }),
      copy({ id: "copy-3", zustand: "ausgeliehen" }),
    ]);

    expect(rows[0].zustand).toBe("frei");
    expect(rows[0].id).toBe("copy-2");
  });

  it("picks ausgeliehen over wartung and nicht-erfasst when no copy is frei", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", zustand: "nicht-erfasst" }),
      copy({ id: "copy-2", zustand: "wartung" }),
      copy({ id: "copy-3", zustand: "ausgeliehen" }),
    ]);

    expect(rows[0].zustand).toBe("ausgeliehen");
  });

  it("preserves first-seen title order", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", boardGameId: "title-b" }),
      copy({ id: "copy-2", boardGameId: "title-a" }),
      copy({ id: "copy-3", boardGameId: "title-b" }),
    ]);

    expect(rows.map((r) => r.id)).toEqual(["copy-1", "copy-2"]);
  });

  it("falls back to the first copy when zustand is absent (guest rows)", () => {
    const rows = groupGamesByTitle([
      { id: "copy-1", boardGameId: "title-1" },
      { id: "copy-2", boardGameId: "title-1" },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].copyCount).toBe(2);
    expect(rows[0].id).toBe("copy-1");
  });
});

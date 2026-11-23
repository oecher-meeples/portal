import { describe, expect, it } from "vitest";
import {
  groupGamesByTitle,
  paginateByTitle,
} from "@/lib/ludothek/title-grouping";
import type { GameZustand } from "@/lib/ludothek/holdings";

type Copy = {
  id: string;
  boardGameId: string;
  zustand?: GameZustand;
  publisher?: string[];
  editionLanguages?: string[];
};

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

  it("counts how many copies share the representative's zustand (#125)", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", zustand: "frei" }),
      copy({ id: "copy-2", zustand: "ausgeliehen-verfuegbar" }),
      copy({ id: "copy-3", zustand: "frei" }),
    ]);

    expect(rows[0].zustand).toBe("frei");
    expect(rows[0].zustandCount).toBe(2);
    expect(rows[0].copyCount).toBe(3);
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
      copy({ id: "copy-3", zustand: "ausgeliehen-verfuegbar" }),
    ]);

    expect(rows[0].zustand).toBe("frei");
    expect(rows[0].id).toBe("copy-2");
  });

  it("picks ausgeliehen over wartung and nicht-erfasst when no copy is frei", () => {
    const rows = groupGamesByTitle([
      copy({ id: "copy-1", zustand: "nicht-erfasst" }),
      copy({ id: "copy-2", zustand: "wartung" }),
      copy({ id: "copy-3", zustand: "ausgeliehen-verfuegbar" }),
    ]);

    expect(rows[0].zustand).toBe("ausgeliehen-verfuegbar");
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

  it("unites the publishers and edition languages of all folded copies", () => {
    const [row] = groupGamesByTitle([
      copy({
        id: "a",
        publisher: ["Kosmos"],
        editionLanguages: ["German"],
      }),
      copy({
        id: "b",
        publisher: ["Kosmos", "Capstone Games"],
        editionLanguages: ["English"],
      }),
    ]);

    expect(row.publisher).toEqual(["Kosmos", "Capstone Games"]);
    expect(row.editionLanguages).toEqual(["German", "English"]);
  });

  it("leaves rows without edition data untouched", () => {
    const [row] = groupGamesByTitle([copy()]);

    expect(row).not.toHaveProperty("publisher");
    expect(row).not.toHaveProperty("editionLanguages");
  });
});

describe("paginateByTitle (#461)", () => {
  // Drei Titel, der erste mit zwei Exemplaren, eines davon weiter hinten.
  const games = [
    copy({ id: "a1", boardGameId: "a" }),
    copy({ id: "b1", boardGameId: "b" }),
    copy({ id: "a2", boardGameId: "a" }),
    copy({ id: "c1", boardGameId: "c" }),
  ];

  it("counts titles, not copies, and keeps all copies of a title together", () => {
    const page = paginateByTitle(games, 0, 1);
    expect(page.items.map((g) => g.id)).toEqual(["a1", "a2"]);
    expect(page.nextOffset).toBe(1);
  });

  it("returns the following titles from the offset on", () => {
    const page = paginateByTitle(games, 1, 1);
    expect(page.items.map((g) => g.id)).toEqual(["b1"]);
    expect(page.nextOffset).toBe(2);
  });

  it("ends with nextOffset null once no title follows", () => {
    expect(paginateByTitle(games, 2, 1)).toEqual({
      items: [games[3]],
      nextOffset: null,
    });
    expect(paginateByTitle(games, 0, 3).nextOffset).toBeNull();
  });

  it("returns an empty page past the end", () => {
    expect(paginateByTitle(games, 10, 5)).toEqual({
      items: [],
      nextOffset: null,
    });
  });

  it("groups the concatenated pages exactly like the whole list", () => {
    const pages = [0, 1, 2].flatMap(
      (offset) => paginateByTitle(games, offset, 1).items,
    );
    expect(groupGamesByTitle(pages)).toEqual(groupGamesByTitle(games));
  });
});

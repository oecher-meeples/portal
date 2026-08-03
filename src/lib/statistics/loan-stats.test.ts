import { describe, expect, it } from "vitest";
import { mostActiveLoanWeekdays, mostBorrowedGames } from "./loan-stats";

const GAMES = [
  { id: "arche-nova", title: "Arche Nova" },
  { id: "brass", title: "Brass: Birmingham" },
  { id: "catan", title: "Catan" },
];

function holding(
  boardGameId: string,
  origin: "INITIAL" | "LOAN" | "RETURN" | "HANDOVER" | "RELOCATION",
  startedAt = new Date("2026-01-05T12:00:00Z"),
) {
  return { boardGameId, origin, startedAt };
}

describe("mostBorrowedGames", () => {
  it("ranks games by loan count, descending", () => {
    const holdings = [
      holding("arche-nova", "LOAN"),
      holding("arche-nova", "LOAN"),
      holding("brass", "LOAN"),
    ];

    expect(mostBorrowedGames(holdings, GAMES)).toEqual([
      { boardGameId: "arche-nova", title: "Arche Nova", count: 2 },
      { boardGameId: "brass", title: "Brass: Birmingham", count: 1 },
    ]);
  });

  it("breaks ties stably by title", () => {
    const holdings = [holding("catan", "LOAN"), holding("brass", "LOAN")];

    expect(mostBorrowedGames(holdings, GAMES).map((g) => g.title)).toEqual([
      "Brass: Birmingham",
      "Catan",
    ]);
  });

  it("counts HANDOVER exactly like LOAN", () => {
    const holdings = [holding("catan", "LOAN"), holding("catan", "HANDOVER")];

    expect(mostBorrowedGames(holdings, GAMES)).toEqual([
      { boardGameId: "catan", title: "Catan", count: 2 },
    ]);
  });

  it("ignores INITIAL, RETURN and RELOCATION", () => {
    const holdings = [
      holding("catan", "INITIAL"),
      holding("catan", "RETURN"),
      holding("catan", "RELOCATION"),
    ];

    expect(mostBorrowedGames(holdings, GAMES)).toEqual([]);
  });

  it("respects the limit", () => {
    const holdings = [
      holding("arche-nova", "LOAN"),
      holding("brass", "LOAN"),
      holding("catan", "LOAN"),
    ];

    expect(mostBorrowedGames(holdings, GAMES, 2)).toHaveLength(2);
  });
});

describe("mostActiveLoanWeekdays", () => {
  it("always returns 7 entries, one per weekday", () => {
    expect(mostActiveLoanWeekdays([])).toEqual([
      { weekday: 0, count: 0 },
      { weekday: 1, count: 0 },
      { weekday: 2, count: 0 },
      { weekday: 3, count: 0 },
      { weekday: 4, count: 0 },
      { weekday: 5, count: 0 },
      { weekday: 6, count: 0 },
    ]);
  });

  it("buckets loans by their local weekday, timezone-independent per case", () => {
    const monday = new Date(2026, 0, 5, 12, 0, 0); // Monday, local noon
    const wednesday = new Date(2026, 0, 7, 12, 0, 0); // Wednesday, local noon

    const holdings = [
      holding("catan", "LOAN", monday),
      holding("catan", "LOAN", monday),
      holding("catan", "HANDOVER", wednesday),
    ];

    const histogram = mostActiveLoanWeekdays(holdings);
    expect(histogram[1]).toEqual({ weekday: 1, count: 2 });
    expect(histogram[3]).toEqual({ weekday: 3, count: 1 });
  });

  it("ignores non-loan origins", () => {
    const day = new Date(2026, 0, 5, 12, 0, 0);
    const holdings = [
      holding("catan", "INITIAL", day),
      holding("catan", "RETURN", day),
    ];

    expect(mostActiveLoanWeekdays(holdings).every((d) => d.count === 0)).toBe(
      true,
    );
  });
});

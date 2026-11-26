import { describe, expect, it } from "vitest";
import { collectHelperDayKeys, filterEventsByDay } from "./helfer-days";

const events = [
  {
    id: "a",
    days: [
      { date: "2026-10-10T00:00:00.000Z" },
      { date: "2026-10-11T00:00:00.000Z" },
    ],
  },
  { id: "b", days: [{ date: "2026-11-01T00:00:00.000Z" }] },
  { id: "c", days: [] },
];

describe("filterEventsByDay", () => {
  it("keeps every event without a selected day", () => {
    expect(filterEventsByDay(events, null)).toHaveLength(3);
  });

  it("keeps only events with a shift day on the selected date", () => {
    expect(filterEventsByDay(events, "2026-10-11").map((e) => e.id)).toEqual([
      "a",
    ]);
    expect(filterEventsByDay(events, "2026-11-01").map((e) => e.id)).toEqual([
      "b",
    ]);
  });

  it("returns nothing for a date without shifts", () => {
    expect(filterEventsByDay(events, "2026-12-24")).toEqual([]);
  });
});

describe("collectHelperDayKeys", () => {
  it("collects the date key of every event day", () => {
    expect([...collectHelperDayKeys(events)].sort()).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-11-01",
    ]);
  });
});

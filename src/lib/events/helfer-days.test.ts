import { describe, expect, it } from "vitest";
import {
  collectHelperDayKeys,
  computeDayShiftBounds,
  filterEventsByDay,
  isAvailabilityTooShort,
} from "./helfer-days";

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

  it("keeps only the days of the selected date inside a remaining event", () => {
    const [event] = filterEventsByDay(events, "2026-10-10");
    expect(event.days.map((d) => d.date)).toEqual(["2026-10-10T00:00:00.000Z"]);
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

describe("computeDayShiftBounds", () => {
  const at = (hour: number) => new Date(2026, 9, 10, hour, 0);

  it("returns null for a day without shifts", () => {
    expect(computeDayShiftBounds([])).toBeNull();
  });

  it("spans the earliest start to the latest end", () => {
    expect(
      computeDayShiftBounds([
        { targetStartsAt: at(14), targetEndsAt: at(18) },
        { targetStartsAt: at(9), targetEndsAt: at(13) },
      ]),
    ).toEqual({ start: at(9), end: at(18) });
  });
});

describe("isAvailabilityTooShort", () => {
  it("warns below two hours only", () => {
    expect(isAvailabilityTooShort([600, 719])).toBe(true);
    expect(isAvailabilityTooShort([600, 720])).toBe(false);
    expect(isAvailabilityTooShort([540, 1080])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  computeVisibleRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
} from "./shift-plan";

describe("computeVisibleRange", () => {
  it("extends the day's opening hours by 4h on each side", () => {
    const day = {
      startsAt: new Date("2026-10-10T10:00:00Z"),
      endsAt: new Date("2026-10-10T18:00:00Z"),
    };
    const event = {
      startsAt: new Date("2026-10-10T09:00:00Z"),
      endsAt: new Date("2026-10-10T19:00:00Z"),
    };

    expect(computeVisibleRange(day, event)).toEqual({
      start: new Date("2026-10-10T06:00:00Z"),
      end: new Date("2026-10-10T22:00:00Z"),
    });
  });

  it("falls back to the event's own start/end when the day has no opening hours", () => {
    const day = { startsAt: null, endsAt: null };
    const event = {
      startsAt: new Date("2026-10-10T09:00:00Z"),
      endsAt: new Date("2026-10-11T19:00:00Z"),
    };

    expect(computeVisibleRange(day, event)).toEqual({
      start: new Date("2026-10-10T05:00:00Z"),
      end: new Date("2026-10-11T23:00:00Z"),
    });
  });

  it("falls back to a single instant when the event has no end date", () => {
    const day = { startsAt: null, endsAt: null };
    const event = { startsAt: new Date("2026-10-10T09:00:00Z"), endsAt: null };

    expect(computeVisibleRange(day, event)).toEqual({
      start: new Date("2026-10-10T05:00:00Z"),
      end: new Date("2026-10-10T13:00:00Z"),
    });
  });
});

describe("buildTimeSlots", () => {
  it("builds one slot per step from start to end, inclusive", () => {
    const range = {
      start: new Date("2026-10-10T08:00:00Z"),
      end: new Date("2026-10-10T09:00:00Z"),
    };

    expect(buildTimeSlots(range, 30)).toEqual([
      new Date("2026-10-10T08:00:00Z"),
      new Date("2026-10-10T08:30:00Z"),
      new Date("2026-10-10T09:00:00Z"),
    ]);
  });
});

describe("buildRoleColumns", () => {
  it("gives each role capacity-many columns, in order", () => {
    const shifts = [
      { roleId: "kueche", roleName: "Küche", capacity: 2 },
      { roleId: "abbau", roleName: "Abbau", capacity: 5 },
    ];

    expect(buildRoleColumns(shifts)).toEqual([
      { roleId: "kueche", roleName: "Küche", capacity: 2, startColumn: 0 },
      { roleId: "abbau", roleName: "Abbau", capacity: 5, startColumn: 2 },
    ]);
  });

  it("sums capacity across multiple shifts of the same role", () => {
    const shifts = [
      { roleId: "kueche", roleName: "Küche", capacity: 2 },
      { roleId: "kueche", roleName: "Küche", capacity: 1 },
    ];

    expect(buildRoleColumns(shifts)).toEqual([
      { roleId: "kueche", roleName: "Küche", capacity: 3, startColumn: 0 },
    ]);
  });

  it("totalColumnCount sums every group's capacity", () => {
    const groups = buildRoleColumns([
      { roleId: "kueche", roleName: "Küche", capacity: 2 },
      { roleId: "abbau", roleName: "Abbau", capacity: 5 },
    ]);

    expect(totalColumnCount(groups)).toBe(7);
  });
});

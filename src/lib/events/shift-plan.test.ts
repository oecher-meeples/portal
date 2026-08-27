import { describe, expect, it } from "vitest";
import {
  computeVisibleRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
  computeShiftCoverage,
  isSlotStaffable,
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

describe("computeShiftCoverage", () => {
  const shift = {
    targetStartsAt: new Date("2026-10-10T10:00:00Z"),
    targetEndsAt: new Date("2026-10-10T14:00:00Z"),
    capacity: 2,
  };

  it("is true when a single booking already covers a capacity-1 shift", () => {
    const single = { ...shift, capacity: 1 };
    const bookings = [
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T14:00:00Z"),
      },
    ];

    expect(computeShiftCoverage(single, bookings)).toBe(true);
  });

  it("is false when there is a gap nobody covers", () => {
    const bookings = [
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T12:00:00Z"),
      },
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T12:00:00Z"),
      },
      // 12:00-14:00 has no coverage at all
    ];

    expect(computeShiftCoverage(shift, bookings)).toBe(false);
  });

  it("is false when only one of two parallel Stellen is covered throughout", () => {
    const bookings = [
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T14:00:00Z"),
      },
    ];

    expect(computeShiftCoverage(shift, bookings)).toBe(false);
  });

  it("is true when two people together cover every instant, capacity 2", () => {
    const bookings = [
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T14:00:00Z"),
      },
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T12:00:00Z"),
      },
      {
        startsAt: new Date("2026-10-10T12:00:00Z"),
        endsAt: new Date("2026-10-10T14:00:00Z"),
      },
    ];

    expect(computeShiftCoverage(shift, bookings)).toBe(true);
  });

  it("ignores bookings entirely outside the target period", () => {
    const single = { ...shift, capacity: 1 };
    const bookings = [
      {
        startsAt: new Date("2026-10-10T10:00:00Z"),
        endsAt: new Date("2026-10-10T14:00:00Z"),
      },
      {
        startsAt: new Date("2026-10-09T00:00:00Z"),
        endsAt: new Date("2026-10-09T23:00:00Z"),
      },
    ];

    expect(computeShiftCoverage(single, bookings)).toBe(true);
  });
});

describe("isSlotStaffable", () => {
  const shiftsForRole = [
    {
      targetStartsAt: new Date("2026-10-10T10:00:00Z"),
      targetEndsAt: new Date("2026-10-10T14:00:00Z"),
    },
  ];

  it("is true for a slot inside the target window", () => {
    expect(
      isSlotStaffable(new Date("2026-10-10T11:00:00Z"), shiftsForRole),
    ).toBe(true);
  });

  it("is false for a slot before the target window", () => {
    expect(
      isSlotStaffable(new Date("2026-10-10T08:00:00Z"), shiftsForRole),
    ).toBe(false);
  });

  it("is false for a slot at or after the target end", () => {
    expect(
      isSlotStaffable(new Date("2026-10-10T14:00:00Z"), shiftsForRole),
    ).toBe(false);
  });

  it("is true when at least one of several windows covers the slot", () => {
    const twoWindows = [
      ...shiftsForRole,
      {
        targetStartsAt: new Date("2026-10-10T16:00:00Z"),
        targetEndsAt: new Date("2026-10-10T18:00:00Z"),
      },
    ];

    expect(isSlotStaffable(new Date("2026-10-10T17:00:00Z"), twoWindows)).toBe(
      true,
    );
  });

  it("is false when there are no shifts for the role", () => {
    expect(isSlotStaffable(new Date("2026-10-10T11:00:00Z"), [])).toBe(false);
  });
});

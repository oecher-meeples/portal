import { describe, expect, it } from "vitest";
import {
  computeVisibleRange,
  intersectTimeRanges,
  findFirstFreeSubRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
  computeShiftCoverage,
  isSlotStaffable,
  resolveSelectedTimeRange,
} from "./shift-plan";

describe("computeVisibleRange", () => {
  it("spans the earliest shift start -1h to the latest shift end +1h", () => {
    const day = { date: new Date(2026, 9, 10) };
    const shiftsForDay = [
      {
        targetStartsAt: new Date(2026, 9, 10, 10, 0),
        targetEndsAt: new Date(2026, 9, 10, 14, 0),
      },
      {
        targetStartsAt: new Date(2026, 9, 10, 13, 0),
        targetEndsAt: new Date(2026, 9, 10, 18, 0),
      },
    ];

    expect(computeVisibleRange(day, shiftsForDay)).toEqual({
      start: new Date(2026, 9, 10, 9, 0),
      end: new Date(2026, 9, 10, 19, 0),
    });
  });

  it("defaults to 16–24 Uhr on a weekday without shifts", () => {
    const day = { date: new Date(2026, 9, 8) }; // Donnerstag

    expect(computeVisibleRange(day, [])).toEqual({
      start: new Date(2026, 9, 8, 16, 0),
      end: new Date(2026, 9, 9, 0, 0),
    });
  });

  it("defaults to 8–24 Uhr on a weekend day without shifts", () => {
    const day = { date: new Date(2026, 9, 10) }; // Samstag

    expect(computeVisibleRange(day, [])).toEqual({
      start: new Date(2026, 9, 10, 8, 0),
      end: new Date(2026, 9, 11, 0, 0),
    });
  });
});

describe("intersectTimeRanges", () => {
  it("returns the overlap of two ranges", () => {
    const a = {
      start: new Date(2026, 9, 10, 10, 0),
      end: new Date(2026, 9, 10, 14, 0),
    };
    const b = {
      start: new Date(2026, 9, 10, 12, 0),
      end: new Date(2026, 9, 10, 18, 0),
    };

    expect(intersectTimeRanges(a, b)).toEqual({
      start: new Date(2026, 9, 10, 12, 0),
      end: new Date(2026, 9, 10, 14, 0),
    });
  });

  it("returns null when the ranges don't overlap", () => {
    const a = {
      start: new Date(2026, 9, 10, 10, 0),
      end: new Date(2026, 9, 10, 12, 0),
    };
    const b = {
      start: new Date(2026, 9, 10, 12, 0),
      end: new Date(2026, 9, 10, 14, 0),
    };

    expect(intersectTimeRanges(a, b)).toBeNull();
  });
});

describe("findFirstFreeSubRange", () => {
  const available = {
    start: new Date(2026, 9, 10, 11, 0),
    end: new Date(2026, 9, 10, 18, 0),
  };

  it("returns the full range when nothing is booked yet", () => {
    expect(findFirstFreeSubRange(available, [])).toEqual(available);
  });

  it("finds the gap before an existing booking, not just after it", () => {
    const booked = [
      {
        start: new Date(2026, 9, 10, 16, 0),
        end: new Date(2026, 9, 10, 17, 30),
      },
    ];

    expect(findFirstFreeSubRange(available, booked)).toEqual({
      start: new Date(2026, 9, 10, 11, 0),
      end: new Date(2026, 9, 10, 16, 0),
    });
  });

  it("finds the gap after the only booking once the earlier gap is filled too", () => {
    const booked = [
      {
        start: new Date(2026, 9, 10, 11, 0),
        end: new Date(2026, 9, 10, 16, 0),
      },
      {
        start: new Date(2026, 9, 10, 16, 0),
        end: new Date(2026, 9, 10, 17, 30),
      },
    ];

    expect(findFirstFreeSubRange(available, booked)).toEqual({
      start: new Date(2026, 9, 10, 17, 30),
      end: new Date(2026, 9, 10, 18, 0),
    });
  });

  it("is unaffected by the order the booked ranges are passed in", () => {
    const booked = [
      {
        start: new Date(2026, 9, 10, 17, 0),
        end: new Date(2026, 9, 10, 18, 0),
      },
      {
        start: new Date(2026, 9, 10, 11, 0),
        end: new Date(2026, 9, 10, 14, 0),
      },
    ];

    expect(findFirstFreeSubRange(available, booked)).toEqual({
      start: new Date(2026, 9, 10, 14, 0),
      end: new Date(2026, 9, 10, 17, 0),
    });
  });

  it("returns null once every instant is already covered", () => {
    const booked = [
      {
        start: new Date(2026, 9, 10, 11, 0),
        end: new Date(2026, 9, 10, 18, 0),
      },
    ];

    expect(findFirstFreeSubRange(available, booked)).toBeNull();
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

describe("resolveSelectedTimeRange", () => {
  const timeSlots = buildTimeSlots(
    {
      start: new Date("2026-10-10T08:00:00Z"),
      end: new Date("2026-10-10T12:00:00Z"),
    },
    30,
  );

  it("uses the anchor and current slot regardless of drag direction", () => {
    expect(resolveSelectedTimeRange(timeSlots, 1, 3, 30)).toEqual({
      startsAt: timeSlots[1],
      endsAt: new Date(timeSlots[3].getTime() + 30 * 60 * 1000),
    });
    expect(resolveSelectedTimeRange(timeSlots, 3, 1, 30)).toEqual({
      startsAt: timeSlots[1],
      endsAt: new Date(timeSlots[3].getTime() + 30 * 60 * 1000),
    });
  });

  it("extends a single-slot selection by one step", () => {
    expect(resolveSelectedTimeRange(timeSlots, 2, 2, 30)).toEqual({
      startsAt: timeSlots[2],
      endsAt: new Date(timeSlots[2].getTime() + 30 * 60 * 1000),
    });
  });
});

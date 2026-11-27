import { describe, expect, it } from "vitest";
import { computeCoveragePercent, shiftGridRows } from "./shift-plan";

describe("shiftGridRows (#620)", () => {
  const rangeStart = new Date(2026, 9, 10, 8, 0);

  it("gives two shifts of the same role distinct, non-overlapping row ranges", () => {
    const first = shiftGridRows(
      {
        targetStartsAt: new Date(2026, 9, 10, 9, 0),
        targetEndsAt: new Date(2026, 9, 10, 13, 0),
      },
      rangeStart,
    );
    const second = shiftGridRows(
      {
        targetStartsAt: new Date(2026, 9, 10, 14, 0),
        targetEndsAt: new Date(2026, 9, 10, 18, 0),
      },
      rangeStart,
    );

    expect(first).toEqual({ rowStart: 4, rowEnd: 12 });
    expect(second).toEqual({ rowStart: 14, rowEnd: 22 });
    expect(second.rowStart).toBeGreaterThanOrEqual(first.rowEnd);
  });

  it("never starts above the first grid row and spans at least one row", () => {
    expect(
      shiftGridRows(
        {
          targetStartsAt: new Date(2026, 9, 10, 7, 0),
          targetEndsAt: new Date(2026, 9, 10, 7, 0),
        },
        rangeStart,
      ),
    ).toEqual({ rowStart: 2, rowEnd: 3 });
  });
});

describe("computeCoveragePercent (#681)", () => {
  const at = (hour: number) => new Date(2026, 9, 10, hour, 0);
  const shift = (
    from: number,
    to: number,
    capacity: number,
    bookings: [number, number][],
  ) => ({
    targetStartsAt: at(from),
    targetEndsAt: at(to),
    capacity,
    bookings: bookings.map(([a, b]) => ({ startsAt: at(a), endsAt: at(b) })),
  });

  it("is null without shifts", () => {
    expect(computeCoveragePercent([])).toBeNull();
  });

  it("is 0 for an unstaffed shift", () => {
    expect(computeCoveragePercent([shift(9, 13, 1, [])])).toBe(0);
  });

  it("is 100 when every shift is gap-free full", () => {
    expect(
      computeCoveragePercent([
        shift(9, 13, 2, [
          [9, 13],
          [9, 13],
        ]),
        shift(14, 18, 1, [[14, 18]]),
      ]),
    ).toBe(100);
  });

  it("weights by time — a gap lowers the percentage proportionally", () => {
    // 4h Soll, 3h besetzt → 75 %
    expect(computeCoveragePercent([shift(9, 13, 1, [[9, 12]])])).toBe(75);
  });

  it("does not count overlapping bookings beyond capacity", () => {
    expect(
      computeCoveragePercent([
        shift(9, 13, 1, [
          [9, 13],
          [9, 13],
        ]),
      ]),
    ).toBe(100);
  });

  it("counts partial capacity: 1 of 2 Stellen over the whole period is 50 %", () => {
    expect(computeCoveragePercent([shift(9, 13, 2, [[9, 13]])])).toBe(50);
  });

  it("pools several shifts by person-hours", () => {
    // Soll 4h + 4h = 8h, besetzt 4h + 0h → 50 %
    expect(
      computeCoveragePercent([
        shift(9, 13, 1, [[9, 13]]),
        shift(14, 18, 1, []),
      ]),
    ).toBe(50);
  });

  it("ignores bookings outside the target period", () => {
    expect(computeCoveragePercent([shift(9, 13, 1, [[13, 15]])])).toBe(0);
  });
});

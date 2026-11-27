import { describe, expect, it } from "vitest";
import {
  diffShiftMatrix,
  groupRowsByDay,
  initialMatrixCells,
  matrixCellKey,
} from "./shift-matrix";

const days = [
  {
    id: "d1",
    date: "2026-10-10T00:00:00.000Z",
    startsAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    endsAt: new Date(2026, 9, 10, 22, 0).toISOString(),
  },
  { id: "d2", date: "2026-10-11T00:00:00.000Z" },
];
const shifts = [{ id: "s1", dayId: "d1", roleId: "rB", bookings: [1, 2] }];

describe("diffShiftMatrix", () => {
  it("adds new cells with opening hours or the 09:00–18:00 fallback", () => {
    const checked = initialMatrixCells(shifts);
    checked.add(matrixCellKey("d1", "rA"));
    checked.add(matrixCellKey("d2", "rA"));
    const { add, removeShiftIds } = diffShiftMatrix(days, shifts, checked);

    expect(removeShiftIds).toEqual([]);
    expect(add).toHaveLength(2);
    expect(add[0].targetStartsAt.getHours()).toBe(12);
    expect(add[0].targetEndsAt.getHours()).toBe(22);
    expect(add[1].targetStartsAt.getHours()).toBe(9);
    expect(add[1].targetEndsAt.getHours()).toBe(18);
  });

  it("removes unchecked cells and counts the bookings lost with them", () => {
    const result = diffShiftMatrix(days, shifts, new Set());
    expect(result.add).toEqual([]);
    expect(result.removeShiftIds).toEqual(["s1"]);
    expect(result.removedBookings).toBe(2);
  });

  it("keeps untouched cells unchanged", () => {
    const result = diffShiftMatrix(days, shifts, initialMatrixCells(shifts));
    expect(result.add).toEqual([]);
    expect(result.removeShiftIds).toEqual([]);
  });
});

describe("groupRowsByDay", () => {
  it("lists every day, even without rows, and puts rows in their own day", () => {
    const groups = groupRowsByDay(days, [
      { key: "a", dayId: "d2" },
      { key: "b", dayId: "d2" },
    ]);
    expect(groups.map((g) => g.rows.length)).toEqual([0, 2]);
  });
});

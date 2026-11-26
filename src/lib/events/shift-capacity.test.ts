import { describe, expect, it } from "vitest";
import {
  computeShiftFillLevel,
  computeShiftFillStatus,
} from "./shift-capacity";

describe("computeShiftFillLevel", () => {
  it("counts bookings regardless of the shift capacity", () => {
    const result = computeShiftFillLevel({ capacity: 4 }, [{}, {}]);

    expect(result).toEqual({ booked: 2, capacity: 4, isFull: false });
  });

  it("counts unconfirmed bookings the same as confirmed ones", () => {
    const bookings = [{ confirmedAt: null }, { confirmedAt: new Date() }];

    const result = computeShiftFillLevel({ capacity: 2 }, bookings);

    expect(result).toEqual({ booked: 2, capacity: 2, isFull: true });
  });

  it("marks a shift as full once bookings reach capacity", () => {
    const result = computeShiftFillLevel({ capacity: 3 }, [{}, {}, {}]);

    expect(result.isFull).toBe(true);
  });

  it("marks an empty shift as not full", () => {
    const result = computeShiftFillLevel({ capacity: 5 }, []);

    expect(result).toEqual({ booked: 0, capacity: 5, isFull: false });
  });
});

describe("computeShiftFillStatus (#677)", () => {
  const shift = {
    capacity: 2,
    targetStartsAt: new Date(2026, 9, 10, 9, 0),
    targetEndsAt: new Date(2026, 9, 10, 13, 0),
  };
  const at = (from: number, to: number) => ({
    startsAt: new Date(2026, 9, 10, from, 0),
    endsAt: new Date(2026, 9, 10, to, 0),
  });

  it("is full when count is reached and the period is covered without gaps", () => {
    const result = computeShiftFillStatus(shift, [at(9, 13), at(9, 13)]);

    expect(result).toMatchObject({
      booked: 2,
      countReached: true,
      hasGap: false,
      isFull: true,
    });
  });

  it("is not full but flags a gap when count is reached with a hole", () => {
    const result = computeShiftFillStatus(shift, [at(9, 11), at(9, 13)]);

    expect(result).toMatchObject({
      countReached: true,
      hasGap: true,
      isFull: false,
    });
  });

  it("is neither full nor flagged when the count is not reached", () => {
    const result = computeShiftFillStatus(shift, [at(9, 13)]);

    expect(result).toMatchObject({
      booked: 1,
      countReached: false,
      hasGap: false,
      isFull: false,
    });
  });
});

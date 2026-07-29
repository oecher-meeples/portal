import { describe, expect, it } from "vitest";
import { computeShiftFillLevel } from "./shift-capacity";

describe("computeShiftFillLevel", () => {
  it("counts bookings regardless of the shift capacity", () => {
    const result = computeShiftFillLevel({ capacity: 4 }, [{}, {}]);

    expect(result).toEqual({ booked: 2, capacity: 4, isFull: false });
  });

  it("counts uncertain bookings the same as certain ones", () => {
    const bookings = [{ uncertain: true }, { uncertain: false }];

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

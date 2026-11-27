import { describe, expect, it } from "vitest";
import { DEFAULT_SHIFT_RANGE, defaultRangeForDay } from "./shift-defaults";

describe("defaultRangeForDay", () => {
  it("falls back to 09:00–18:00 without opening hours", () => {
    expect(defaultRangeForDay(undefined)).toEqual(DEFAULT_SHIFT_RANGE);
    expect(defaultRangeForDay({ startsAt: null, endsAt: null })).toEqual([
      540, 1080,
    ]);
  });

  it("uses the day's opening hours when set", () => {
    const startsAt = new Date(2026, 9, 10, 12, 0).toISOString();
    const endsAt = new Date(2026, 9, 10, 22, 0).toISOString();
    expect(defaultRangeForDay({ startsAt, endsAt })).toEqual([720, 1320]);
  });
});

import { describe, expect, it } from "vitest";
import {
  minutesSinceMidnight,
  formatMinutesAsTime,
  combineDateAndMinutes,
} from "./time-of-day";

describe("minutesSinceMidnight", () => {
  it("converts an ISO datetime to minutes since local midnight", () => {
    expect(minutesSinceMidnight("2026-10-10T14:30:00")).toBe(870);
  });

  it("is 0 at midnight", () => {
    expect(minutesSinceMidnight("2026-10-10T00:00:00")).toBe(0);
  });
});

describe("formatMinutesAsTime", () => {
  it("formats minutes as zero-padded HH:mm", () => {
    expect(formatMinutesAsTime(870)).toBe("14:30");
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatMinutesAsTime(65)).toBe("01:05");
  });
});

describe("combineDateAndMinutes", () => {
  it("combines a day's date with a minutes-since-midnight value", () => {
    const result = combineDateAndMinutes("2026-10-10T00:00:00.000Z", 870);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(9);
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

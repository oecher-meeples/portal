import { describe, expect, it } from "vitest";
import {
  birthDateValidator,
  combineValidators,
  excludeDates,
  excludeRanges,
  maxDate,
  minDate,
  onlyWeekdays,
} from "@/components/ui/constraints";

describe("minDate", () => {
  const validator = minDate(new Date(2020, 0, 1));

  it("rejects a date before min", () => {
    expect(validator(new Date(2019, 11, 31))).toEqual({
      valid: false,
      reason: expect.any(String),
    });
  });

  it("accepts min itself and anything after", () => {
    expect(validator(new Date(2020, 0, 1))).toEqual({ valid: true });
    expect(validator(new Date(2020, 0, 2))).toEqual({ valid: true });
  });
});

describe("maxDate", () => {
  const validator = maxDate(new Date(2020, 0, 1));

  it("rejects a date after max", () => {
    expect(validator(new Date(2020, 0, 2)).valid).toBe(false);
  });

  it("accepts max itself and anything before", () => {
    expect(validator(new Date(2020, 0, 1)).valid).toBe(true);
    expect(validator(new Date(2019, 11, 31)).valid).toBe(true);
  });
});

describe("onlyWeekdays", () => {
  it("rejects Saturday and Sunday", () => {
    expect(onlyWeekdays(new Date(2026, 0, 3)).valid).toBe(false); // Samstag
    expect(onlyWeekdays(new Date(2026, 0, 4)).valid).toBe(false); // Sonntag
  });

  it("accepts weekdays", () => {
    expect(onlyWeekdays(new Date(2026, 0, 5)).valid).toBe(true); // Montag
  });
});

describe("excludeDates", () => {
  const validator = excludeDates([new Date(2026, 5, 15)]);

  it("rejects an excluded day regardless of time-of-day", () => {
    expect(validator(new Date(2026, 5, 15, 23, 59)).valid).toBe(false);
  });

  it("accepts every other day", () => {
    expect(validator(new Date(2026, 5, 16)).valid).toBe(true);
  });
});

describe("excludeRanges", () => {
  const validator = excludeRanges([
    [new Date(2026, 5, 10), new Date(2026, 5, 20)],
  ]);

  it("rejects the range boundaries and everything in between", () => {
    expect(validator(new Date(2026, 5, 10)).valid).toBe(false);
    expect(validator(new Date(2026, 5, 15)).valid).toBe(false);
    expect(validator(new Date(2026, 5, 20)).valid).toBe(false);
  });

  it("accepts dates outside the range", () => {
    expect(validator(new Date(2026, 5, 9)).valid).toBe(true);
    expect(validator(new Date(2026, 5, 21)).valid).toBe(true);
  });
});

describe("combineValidators", () => {
  it("returns the first violation encountered", () => {
    const validator = combineValidators(
      minDate(new Date(2020, 0, 1)),
      onlyWeekdays,
    );

    const result = validator(new Date(2019, 11, 31));
    expect(result.valid).toBe(false);
  });

  it("is valid when every validator passes", () => {
    const validator = combineValidators(
      minDate(new Date(2020, 0, 1)),
      onlyWeekdays,
    );

    expect(validator(new Date(2026, 0, 5)).valid).toBe(true); // Montag
  });
});

describe("birthDateValidator (Live-Review F4)", () => {
  const now = new Date(2026, 5, 15);
  const validator = birthDateValidator(now);

  it("rejects a date in the future", () => {
    expect(validator(new Date(2026, 5, 16)).valid).toBe(false);
  });

  it("rejects a date older than 100 years", () => {
    expect(validator(new Date(1926, 5, 14)).valid).toBe(false);
  });

  it("accepts today and exactly 100 years ago", () => {
    expect(validator(now).valid).toBe(true);
    expect(validator(new Date(1926, 5, 15)).valid).toBe(true);
  });
});

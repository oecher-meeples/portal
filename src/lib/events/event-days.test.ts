import { describe, expect, it } from "vitest";
import { enumerateEventDates, endOfUtcDay } from "./event-days";

describe("enumerateEventDates", () => {
  it("returns a single day when there is no end date", () => {
    const dates = enumerateEventDates(new Date("2026-10-10T14:00:00Z"), null);

    expect(dates).toEqual([new Date("2026-10-10T00:00:00Z")]);
  });

  it("returns a single day when start and end fall on the same date", () => {
    const dates = enumerateEventDates(
      new Date("2026-10-10T09:00:00Z"),
      new Date("2026-10-10T20:00:00Z"),
    );

    expect(dates).toEqual([new Date("2026-10-10T00:00:00Z")]);
  });

  it("enumerates every day across a multi-day range, at UTC midnight", () => {
    const dates = enumerateEventDates(
      new Date("2026-10-10T14:00:00Z"),
      new Date("2026-10-12T09:00:00Z"),
    );

    expect(dates).toEqual([
      new Date("2026-10-10T00:00:00Z"),
      new Date("2026-10-11T00:00:00Z"),
      new Date("2026-10-12T00:00:00Z"),
    ]);
  });
});

describe("endOfUtcDay", () => {
  it("returns 23:59:59.999 UTC of the given date's calendar day", () => {
    expect(endOfUtcDay(new Date("2026-10-10T14:00:00Z"))).toEqual(
      new Date("2026-10-10T23:59:59.999Z"),
    );
  });

  it("floors a midnight date to the same day's end", () => {
    expect(endOfUtcDay(new Date("2026-10-10T00:00:00Z"))).toEqual(
      new Date("2026-10-10T23:59:59.999Z"),
    );
  });
});

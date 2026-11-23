import { describe, expect, it } from "vitest";
import { checksPerMonth, checkStatsWindowStart } from "./check-stats";

const NOW = new Date("2026-11-23T12:00:00Z");

describe("checksPerMonth (#599)", () => {
  it("returns 12 months up to and including the current one, gaps as 0", () => {
    const months = checksPerMonth([], NOW);

    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({
      key: "2025-12",
      longLabel: "Dezember 2025",
      count: 0,
    });
    expect(months[11]).toMatchObject({
      key: "2026-11",
      shortLabel: expect.stringMatching(/^Nov.?$/),
      longLabel: "November 2026",
      count: 0,
    });
    expect(months.every((m) => m.count === 0)).toBe(true);
  });

  it("counts by Berlin month: 00:30 on the 1st belongs to the new month", () => {
    // 2026-11-01 00:30 Berlin (CET, UTC+1) = 2026-10-31 23:30 UTC
    const boundary = new Date("2026-10-31T23:30:00Z");
    // 2026-08-01 00:30 Berlin (CEST, UTC+2) = 2026-07-31 22:30 UTC
    const summerBoundary = new Date("2026-07-31T22:30:00Z");

    const months = checksPerMonth(
      [
        boundary,
        summerBoundary,
        new Date("2026-10-15T10:00:00Z"),
        new Date("2026-10-16T10:00:00Z"),
      ],
      NOW,
    );
    const byKey = Object.fromEntries(months.map((m) => [m.key, m.count]));

    expect(byKey["2026-11"]).toBe(1);
    expect(byKey["2026-10"]).toBe(2);
    expect(byKey["2026-08"]).toBe(1);
    expect(byKey["2026-07"]).toBe(0);
  });

  it("ignores checks outside the window", () => {
    const months = checksPerMonth(
      [new Date("2025-11-30T10:00:00Z"), new Date("2027-01-01T10:00:00Z")],
      NOW,
    );

    expect(months.reduce((sum, m) => sum + m.count, 0)).toBe(0);
  });

  it("crosses the year boundary when now is in January", () => {
    const months = checksPerMonth([], new Date("2027-01-10T12:00:00Z"));

    expect(months.map((m) => m.key).slice(-2)).toEqual(["2026-12", "2027-01"]);
    expect(months[0].key).toBe("2026-02");
  });
});

describe("checkStatsWindowStart", () => {
  it("lies before Berlin midnight of the first shown month", () => {
    const start = checkStatsWindowStart(NOW);
    // 2025-12-01 00:00 Berlin = 2025-11-30 23:00 UTC
    expect(start.getTime()).toBeLessThanOrEqual(
      new Date("2025-11-30T23:00:00Z").getTime(),
    );
    expect(start.getTime()).toBeGreaterThan(
      new Date("2025-11-29T00:00:00Z").getTime(),
    );
  });
});

import { describe, expect, it, vi, type Mock } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  DEFAULT_ANALYTICS_WINDOW,
  dayKey,
  fillDailySeries,
  getAnalyticsOverview,
  parseAnalyticsWindow,
  sharePercent,
  windowDayKeys,
  windowStart,
} = await import("./queries");

// groupBy's overloaded generic signature defeats vitest-mock-extended's
// typing (no `.mockResolvedValue` on it) — treat it as a plain mock.
const groupByMock = () => prismaMock.pageView.groupBy as unknown as Mock;

describe("parseAnalyticsWindow", () => {
  it.each([
    ["7", 7],
    ["30", 30],
    ["90", 90],
    [90, 90],
  ])("accepts %s", (value, expected) => {
    expect(parseAnalyticsWindow(value)).toBe(expected);
  });

  it.each([undefined, "", "14", "-7", "abc", "1e9"])(
    "falls back to the default for %s",
    (value) => {
      expect(parseAnalyticsWindow(value)).toBe(DEFAULT_ANALYTICS_WINDOW);
    },
  );
});

describe("dayKey", () => {
  it("uses the Berlin calendar day, not UTC", () => {
    // 23:30 UTC on 3 Oct = 01:30 on 4 Oct in Berlin (CEST)
    expect(dayKey(new Date("2026-10-03T23:30:00Z"))).toBe("2026-10-04");
    expect(dayKey(new Date("2026-10-03T21:30:00Z"))).toBe("2026-10-03");
  });
});

describe("windowDayKeys / windowStart", () => {
  it("lists the last N calendar days ending today, oldest first", () => {
    expect(windowDayKeys(3, new Date("2026-10-03T10:00:00Z"))).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("does not skip or repeat a day across the spring DST switch", () => {
    // 29 Mar 2026 has only 23 hours in Berlin
    expect(windowDayKeys(3, new Date("2026-03-29T22:30:00Z"))).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
  });

  it("starts at Berlin midnight in summer time (UTC+2)", () => {
    expect(windowStart(7, new Date("2026-10-03T10:00:00Z")).toISOString()).toBe(
      "2026-09-26T22:00:00.000Z",
    );
  });

  it("starts at Berlin midnight in winter time (UTC+1)", () => {
    expect(windowStart(1, new Date("2026-12-24T10:00:00Z")).toISOString()).toBe(
      "2026-12-23T23:00:00.000Z",
    );
  });
});

describe("fillDailySeries", () => {
  it("fills missing days with 0 and drops days outside the window", () => {
    expect(
      fillDailySeries(
        [
          { day: "2026-10-02", count: 5 },
          { day: "2026-09-01", count: 99 },
        ],
        ["2026-10-01", "2026-10-02", "2026-10-03"],
      ),
    ).toEqual([
      { day: "2026-10-01", count: 0 },
      { day: "2026-10-02", count: 5 },
      { day: "2026-10-03", count: 0 },
    ]);
  });
});

describe("sharePercent", () => {
  it("rounds to whole percent and handles an empty total", () => {
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(2, 3)).toBe(67);
    expect(sharePercent(0, 0)).toBe(0);
  });
});

describe("getAnalyticsOverview", () => {
  const NOW = new Date("2026-10-03T10:00:00Z");

  function group<K extends string>(
    key: K,
    label: string | null,
    count: number,
  ) {
    return { [key]: label, _count: { _all: count } };
  }

  it("aggregates totals, a gap-free daily series and sorted rankings", async () => {
    prismaMock.pageView.count.mockResolvedValue(12);
    prismaMock.$queryRaw.mockResolvedValue([
      { day: "2026-10-01", count: 4 },
      // COUNT may come back as bigint depending on the driver
      { day: "2026-10-03", count: BigInt(8) },
    ]);
    groupByMock()
      .mockResolvedValueOnce([
        group("path", "/", 7),
        group("path", "/ludothek", 5),
      ])
      .mockResolvedValueOnce([group("referrer", "instagram.com", 3)])
      .mockResolvedValueOnce([
        group("device", "Mobil", 4),
        group("device", "Desktop", 8),
      ])
      .mockResolvedValueOnce([
        group("browser", "Safari", 6),
        group("browser", "Chrome", 6),
      ]);

    const overview = await getAnalyticsOverview(7, NOW);

    expect(overview.days).toBe(7);
    expect(overview.total).toBe(12);
    expect(overview.daily).toHaveLength(7);
    expect(overview.daily[0]).toEqual({ day: "2026-09-27", count: 0 });
    expect(overview.daily.slice(-3)).toEqual([
      { day: "2026-10-01", count: 4 },
      { day: "2026-10-02", count: 0 },
      { day: "2026-10-03", count: 8 },
    ]);
    expect(overview.topPaths).toEqual([
      { label: "/", count: 7 },
      { label: "/ludothek", count: 5 },
    ]);
    expect(overview.topReferrers).toEqual([
      { label: "instagram.com", count: 3 },
    ]);
    // sorted by count desc …
    expect(overview.devices.map((d) => d.label)).toEqual(["Desktop", "Mobil"]);
    // … ties broken alphabetically
    expect(overview.browsers.map((b) => b.label)).toEqual(["Chrome", "Safari"]);
  });

  it("restricts every query to the window and limits the top lists", async () => {
    prismaMock.pageView.count.mockResolvedValue(0);
    prismaMock.$queryRaw.mockResolvedValue([]);
    groupByMock().mockResolvedValue([]);

    const overview = await getAnalyticsOverview(30, NOW);

    const since = windowStart(30, NOW);
    expect(prismaMock.pageView.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: since } },
    });
    const [pathsArgs, referrerArgs] = groupByMock().mock.calls;
    expect(pathsArgs[0]).toMatchObject({
      by: ["path"],
      where: { createdAt: { gte: since } },
      take: 10,
    });
    expect(referrerArgs[0]).toMatchObject({
      by: ["referrer"],
      where: { createdAt: { gte: since }, referrer: { not: null } },
    });
    expect(overview.daily).toHaveLength(30);
    expect(overview.daily.every((d) => d.count === 0)).toBe(true);
    expect(overview.topPaths).toEqual([]);
  });

  it("drops null groups defensively", async () => {
    prismaMock.pageView.count.mockResolvedValue(1);
    prismaMock.$queryRaw.mockResolvedValue([]);
    groupByMock().mockResolvedValue([group("referrer", null, 1)]);

    const overview = await getAnalyticsOverview(7, NOW);

    expect(overview.topReferrers).toEqual([]);
  });
});

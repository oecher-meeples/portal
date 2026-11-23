import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

/**
 * Leseseite des In-App-Trackings: Aggregationen über `PageView` fürs
 * Admin-Dashboard. Gruppiert wird in der Datenbank (`groupBy`/`COUNT`), nie
 * über alle Zeilen in JS. Kalendertage gelten in Vereinszeit (Europe/Berlin),
 * unabhängig von der Zeitzone des Containers (im Docker-Image meist UTC).
 */

export const ANALYTICS_TIME_ZONE = "Europe/Berlin";

/** Wählbare Zeitfenster in Tagen (Dashboard-Filter). */
export const ANALYTICS_WINDOWS = [7, 30, 90] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];
export const DEFAULT_ANALYTICS_WINDOW: AnalyticsWindow = 30;

const TOP_LIMIT = 10;

/** Ungültige/fehlende `?tage=`-Werte fallen auf den Standard zurück. */
export function parseAnalyticsWindow(value: unknown): AnalyticsWindow {
  const days = Number(value);
  return (ANALYTICS_WINDOWS as readonly number[]).includes(days)
    ? (days as AnalyticsWindow)
    : DEFAULT_ANALYTICS_WINDOW;
}

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HOUR_IN_ZONE = new Intl.DateTimeFormat("en-GB", {
  timeZone: ANALYTICS_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-03" — Kalendertag des Zeitpunkts in Vereinszeit. */
export function dayKey(date: Date): string {
  return DAY_KEY.format(date);
}

/** Reine Kalenderarithmetik auf "YYYY-MM-DD" (DST-sicher, kein 24h-Rechnen). */
function shiftDayKey(key: string, deltaDays: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + deltaDays))
    .toISOString()
    .slice(0, 10);
}

/** UTC-Zeitpunkt von 00:00 Vereinszeit am Kalendertag `key`. */
function startOfDayInZone(key: string): Date {
  const utcMidnight = new Date(`${key}T00:00:00Z`);
  // Um 00:00 UTC zeigt die Uhr in Berlin 01 (MEZ) bzw. 02 (MESZ) — das ist
  // der Offset, der auch um 00:00 Ortszeit desselben Tages gilt (die
  // Umstellung passiert erst um 01:00 UTC).
  const offsetHours = Number(HOUR_IN_ZONE.format(utcMidnight)) % 24;
  return new Date(utcMidnight.getTime() - offsetHours * 60 * 60 * 1000);
}

/** Die `days` Kalendertage bis einschließlich heute, älteste zuerst. */
export function windowDayKeys(days: number, now: Date = new Date()): string[] {
  const today = dayKey(now);
  return Array.from({ length: days }, (_, index) =>
    shiftDayKey(today, index - (days - 1)),
  );
}

/** Beginn des Zeitfensters: 00:00 Vereinszeit des ältesten Tages. */
export function windowStart(days: number, now: Date = new Date()): Date {
  return startOfDayInZone(windowDayKeys(days, now)[0]);
}

export type DailyCount = { day: string; count: number };

/**
 * Füllt Tage ohne Aufrufe mit 0 auf, damit das Diagramm eine lückenlose
 * Zeitachse hat. Zeilen außerhalb des Fensters werden ignoriert.
 */
export function fillDailySeries(
  rows: DailyCount[],
  dayKeys: string[],
): DailyCount[] {
  const countByDay = new Map(rows.map((row) => [row.day, row.count]));
  return dayKeys.map((day) => ({ day, count: countByDay.get(day) ?? 0 }));
}

export type LabelCount = { label: string; count: number };

export type AnalyticsOverview = {
  days: AnalyticsWindow;
  total: number;
  daily: DailyCount[];
  topPaths: LabelCount[];
  topReferrers: LabelCount[];
  devices: LabelCount[];
  browsers: LabelCount[];
};

type GroupRow<K extends string> = Record<K, string | null> & {
  _count: { _all: number };
};

function toLabelCounts<K extends string>(
  rows: GroupRow<K>[],
  key: K,
): LabelCount[] {
  return rows
    .filter((row) => row[key] !== null)
    .map((row) => ({ label: row[key] as string, count: row._count._all }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function countDaily(since: Date): Promise<DailyCount[]> {
  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>(
    Prisma.sql`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM page_views
      WHERE "createdAt" >= ${since}
      GROUP BY 1
    `,
  );
  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

/** Alle Kennzahlen fürs Dashboard über die letzten `days` Kalendertage. */
export async function getAnalyticsOverview(
  days: AnalyticsWindow,
  now: Date = new Date(),
): Promise<AnalyticsOverview> {
  const dayKeys = windowDayKeys(days, now);
  const since = startOfDayInZone(dayKeys[0]);
  const where = { createdAt: { gte: since } };

  const [total, daily, paths, referrers, devices, browsers] = await Promise.all(
    [
      prisma.pageView.count({ where }),
      countDaily(since),
      prisma.pageView.groupBy({
        by: ["path"],
        where,
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: TOP_LIMIT,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { ...where, referrer: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: TOP_LIMIT,
      }),
      prisma.pageView.groupBy({
        by: ["device"],
        where,
        _count: { _all: true },
      }),
      prisma.pageView.groupBy({
        by: ["browser"],
        where,
        _count: { _all: true },
      }),
    ],
  );

  return {
    days,
    total,
    daily: fillDailySeries(daily, dayKeys),
    topPaths: toLabelCounts(paths, "path"),
    topReferrers: toLabelCounts(referrers, "referrer"),
    devices: toLabelCounts(devices, "device"),
    browsers: toLabelCounts(browsers, "browser"),
  };
}

/** Anteil in ganzen Prozent (für Geräte-/Browser-Aufteilung). */
export function sharePercent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

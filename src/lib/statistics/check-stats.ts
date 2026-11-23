/**
 * Exemplar-Kontrollen pro Monat (#599) — reine Zählung der
 * `GameCopyCheck`-Datensätze, ohne Namen. Monatsgrenzen in Berliner Zeit:
 * eine Kontrolle am Monatsersten 00:30 Uhr zählt zum neuen Monat, obwohl sie
 * in UTC noch im alten liegt.
 */

const TIME_ZONE = "Europe/Berlin";

const MONTH_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});
// Labels aus einem UTC-Monatsmitte-Datum — die Zeitzone ist dafür egal.
const SHORT_LABEL = new Intl.DateTimeFormat("de-DE", {
  timeZone: "UTC",
  month: "short",
});
const LONG_LABEL = new Intl.DateTimeFormat("de-DE", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

export type MonthCount = {
  /** "2026-11" */
  key: string;
  /** "Nov" (je nach ICU-Version mit Punkt) */
  shortLabel: string;
  /** "November 2026" */
  longLabel: string;
  count: number;
};

function berlinYearMonth(date: Date) {
  const parts = MONTH_KEY.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Die letzten `months` Berliner Monate bis einschließlich `now`, älteste zuerst. */
function lastMonths(now: Date, months: number) {
  const { year, month } = berlinYearMonth(now);
  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const index = year * 12 + (month - 1) - offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });
}

/**
 * Untere Grenze für die DB-Abfrage: sicher vor Mitternacht (Berlin) des
 * ersten gezeigten Monats — `checksPerMonth` filtert danach exakt.
 */
export function checkStatsWindowStart(now: Date, months = 12): Date {
  const [first] = lastMonths(now, months);
  return new Date(Date.UTC(first.year, first.month - 1, 1) - 3 * 3_600_000);
}

export function checksPerMonth(
  checkedAts: Date[],
  now: Date,
  months = 12,
): MonthCount[] {
  const counts = new Map<string, number>();
  for (const checkedAt of checkedAts) {
    const { year, month } = berlinYearMonth(checkedAt);
    const key = monthKey(year, month);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return lastMonths(now, months).map(({ year, month }) => {
    const mid = new Date(Date.UTC(year, month - 1, 15));
    const key = monthKey(year, month);
    return {
      key,
      shortLabel: SHORT_LABEL.format(mid),
      longLabel: LONG_LABEL.format(mid),
      count: counts.get(key) ?? 0,
    };
  });
}

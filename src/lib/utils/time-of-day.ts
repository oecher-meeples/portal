/**
 * Minutes-since-midnight math shared by every 00:00–24:00 `RangeSlider`
 * (Helferplan-Verfügbarkeit, Schichten-Schnellbearbeitung) — the slider
 * itself is fachfrei and only knows numbers, these functions bridge to/from
 * the `Date` values the write-side actions expect.
 */
export const MINUTES_PER_DAY = 24 * 60;

/** Minutes since local midnight for a given ISO datetime. */
export function minutesSinceMidnight(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

/** "14:30" from a minutes-since-midnight value. */
export function formatMinutesAsTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

/** Combines a day's own date with a minutes-since-midnight value into the
 * Date the write-side actions expect — the day supplies the date, the
 * slider supplies the time of day. */
export function combineDateAndMinutes(dateIso: string, minutes: number): Date {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  date.setMinutes(minutes);
  return date;
}

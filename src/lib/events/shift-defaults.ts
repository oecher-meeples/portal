import { minutesSinceMidnight } from "@/lib/utils/time-of-day";

/** Fallback für einen Tag ohne hinterlegte Öffnungszeiten (09:00–18:00). */
export const DEFAULT_SHIFT_RANGE: [number, number] = [9 * 60, 18 * 60];

/** Ziel-Zeitraum einer neuen Schicht in Minuten seit Mitternacht: die
 * Öffnungszeiten des Tages, sonst {@link DEFAULT_SHIFT_RANGE}. */
export function defaultRangeForDay(
  day: { startsAt?: string | null; endsAt?: string | null } | undefined,
): [number, number] {
  if (day?.startsAt && day.endsAt) {
    return [
      minutesSinceMidnight(day.startsAt),
      minutesSinceMidnight(day.endsAt),
    ];
  }
  return DEFAULT_SHIFT_RANGE;
}

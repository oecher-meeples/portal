/** Tagesschlüssel `YYYY-MM-DD` eines Event-Tags (wie `combineDateAndMinutes`). */
export function eventDayKey(dateIso: string): string {
  return dateIso.slice(0, 10);
}

/** Alle Tage (als Schlüssel), an denen mindestens ein Event Schichten hat. */
export function collectHelperDayKeys(
  events: { days: { date: string }[] }[],
): Set<string> {
  return new Set(
    events.flatMap((event) => event.days.map((day) => eventDayKey(day.date))),
  );
}

/**
 * Tagesfilter des Helferplans (#674): Events ohne Schicht-Tag an `dayKey`
 * entfallen, bei den übrigen bleiben nur die Tage dieses Tages erhalten.
 * Ohne Auswahl bleibt alles unverändert. Die Tage je Event enthalten bereits
 * nur Tage mit Schichten.
 */
export function filterEventsByDay<T extends { days: { date: string }[] }>(
  events: T[],
  dayKey: string | null,
): T[] {
  if (dayKey === null) return events;
  return events
    .map((event) => ({
      ...event,
      days: event.days.filter((day) => eventDayKey(day.date) === dayKey),
    }))
    .filter((event) => event.days.length > 0);
}

/** Empfohlene Mindestdauer einer gemeldeten Verfügbarkeit (#674), in Minuten. */
export const MIN_AVAILABILITY_MINUTES = 120;

/** Nicht blockierender Hinweis: gemeldetes Fenster kürzer als die Empfehlung. */
export function isAvailabilityTooShort(range: [number, number]): boolean {
  return range[1] - range[0] < MIN_AVAILABILITY_MINUTES;
}

/**
 * Äußere Grenzen der Schichtzeiten eines Tages (#674): frühester Beginn bis
 * spätestes Ende. Innerhalb dieser Grenzen kann Verfügbarkeit gemeldet
 * werden — Client (Slider-Min/Max) und Server nutzen dieselbe Funktion.
 * `null`, wenn der Tag keine Schichten hat (dann gilt keine Grenze).
 */
export function computeDayShiftBounds(
  shifts: { targetStartsAt: Date; targetEndsAt: Date }[],
): { start: Date; end: Date } | null {
  if (shifts.length === 0) return null;
  return {
    start: new Date(Math.min(...shifts.map((s) => s.targetStartsAt.getTime()))),
    end: new Date(Math.max(...shifts.map((s) => s.targetEndsAt.getTime()))),
  };
}

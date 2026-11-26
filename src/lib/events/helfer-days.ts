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
 * Tagesfilter des Helferplans (#674): nur Events, die an `dayKey` eine
 * Schicht-Tag-Zeile haben; ohne Auswahl bleiben alle erhalten. Die Tage je
 * Event enthalten bereits nur Tage mit Schichten.
 */
export function filterEventsByDay<T extends { days: { date: string }[] }>(
  events: T[],
  dayKey: string | null,
): T[] {
  if (dayKey === null) return events;
  return events.filter((event) =>
    event.days.some((day) => eventDayKey(day.date) === dayKey),
  );
}

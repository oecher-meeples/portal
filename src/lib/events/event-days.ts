/**
 * `EventDay` derives its rows from `Event.startsAt`/`endsAt` (#150) — a pure date
 * range, no time-of-day. This is the single place that turns that range into the
 * list of calendar days it spans, reused by `createEvent`/`updateEvent`.
 */

/** Midnight UTC for the given date, so day comparisons/equality are exact. */
function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** End of the UTC calendar day for `date` — 23:59:59.999. Used when persisting
 * `Event.endsAt` so a date-only range (#150) doesn't make the event look like
 * it already ended for most of its final day: `isEventCurrentlyRunning`,
 * `UPCOMING_EVENT_WHERE` and the Bring&Buy window (`src/lib/events/upcoming.ts`)
 * all compare `endsAt` against `new Date()`. */
export function endOfUtcDay(date: Date): Date {
  return new Date(toUtcMidnight(date).getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Every calendar day from `startsAt` to `endsAt` (inclusive), each at UTC midnight.
 * A missing `endsAt` is a single-day event. */
export function enumerateEventDates(
  startsAt: Date,
  endsAt: Date | null,
): Date[] {
  const start = toUtcMidnight(startsAt);
  const end = toUtcMidnight(endsAt ?? startsAt);

  const dates: Date[] = [];
  for (
    let day = start;
    day.getTime() <= end.getTime();
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
  ) {
    dates.push(day);
  }
  return dates;
}

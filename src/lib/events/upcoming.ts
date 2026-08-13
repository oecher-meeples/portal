import { prisma } from "@/lib/utils/prisma";

/**
 * "Kommend" heißt: noch nicht beendet — inklusive Events ohne Enddatum.
 * Eine Definition, damit Helferplan, Flohmarkt-Kasse und Marktansicht
 * nicht auseinanderlaufen.
 */
export const UPCOMING_EVENT_WHERE = {
  OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
} as const;

export function findUpcomingEvents<
  S extends Record<string, boolean> = { id: true; title: true },
>(select?: S) {
  return prisma.event.findMany({
    where: { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
    orderBy: { startsAt: "asc" },
    select: (select ?? { id: true, title: true }) as S,
  });
}

/**
 * True only while an event is actually happening — started, not yet ended.
 * Stricter than `UPCOMING_EVENT_WHERE`, which also matches events that
 * haven't started yet. Used to gate unauthenticated guest-area actions,
 * where a caller could otherwise pass any `eventId` and pull data for an
 * event that isn't currently open to guests (see ADR 0005).
 */
export async function isEventCurrentlyRunning(
  eventId: string,
): Promise<boolean> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      startsAt: { lte: new Date() },
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    select: { id: true },
  });
  return event !== null;
}

/**
 * The event happening right now, if any — for pages that aren't already
 * event-scoped (e.g. the public Ludothek detail page, #121) but still want
 * to show "im Raum"-style aggregates while a Spieleabend is running.
 */
export async function findCurrentEvent() {
  return prisma.event.findFirst({
    where: {
      startsAt: { lte: new Date() },
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
}

/**
 * Picks the event the user asked for, falling back to the next upcoming one.
 * Returns null when there is no event at all.
 */
export function resolveSelectedEventId(
  events: { id: string }[],
  requestedEventId: string | undefined,
): string | null {
  if (
    requestedEventId &&
    events.some((event) => event.id === requestedEventId)
  ) {
    return requestedEventId;
  }
  return events[0]?.id ?? null;
}

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

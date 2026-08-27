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
 * True while at least one upcoming event has an open helper request
 * (`Event.helpersWanted`, #155) — gates both the Dashboard-Karte and the
 * "Helferplan" nav entry (see sidebar.tsx/app-shell.tsx).
 */
export async function hasOpenHelperRequest(): Promise<boolean> {
  const event = await findOpenHelperRequestEvent();
  return event !== null;
}

/** The earliest upcoming event with an open helper request, if any — feeds
 * the Dashboard-Karte's link target (#155). */
export async function findOpenHelperRequestEvent() {
  return prisma.event.findFirst({
    where: {
      helpersWanted: true,
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true },
  });
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

/** Bring&Buy is announced this far ahead of an event (#211). */
export const BRING_AND_BUY_WINDOW_DAYS = 30;

function bringAndBuyWindowEnd(now: Date): Date {
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + BRING_AND_BUY_WINDOW_DAYS);
  return windowEnd;
}

/**
 * True once a single event's Bring&Buy market should be visible to guests
 * (#211): the event has the flag, hasn't ended yet, and starts within the
 * next `BRING_AND_BUY_WINDOW_DAYS` days. Kept as a pure function so callers
 * that already loaded one event (e.g. the guest route) don't need a query.
 */
export function isBringAndBuyMarketOpen(
  event: { hasBringAndBuyMarket: boolean; startsAt: Date; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (!event.hasBringAndBuyMarket) return false;
  if (event.endsAt !== null && event.endsAt < now) return false;
  return event.startsAt <= bringAndBuyWindowEnd(now);
}

/** Events with an open Bring&Buy market (#211) — same window as `isBringAndBuyMarketOpen`. */
export function findUpcomingBringAndBuyEvents<
  S extends Record<string, boolean> = { id: true; title: true },
>(select?: S, now: Date = new Date()) {
  return prisma.event.findMany({
    where: {
      hasBringAndBuyMarket: true,
      startsAt: { lte: bringAndBuyWindowEnd(now) },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
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

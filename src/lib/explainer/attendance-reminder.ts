import { cache } from "react";
import { prisma } from "@/lib/utils/prisma";
import {
  findUpcomingEventsVisibleToMembers,
  isEventRunningAt,
} from "@/lib/events/upcoming";
import type { AutomatedNotificationDefinition } from "@/lib/notifications/registry";

/**
 * Laufendes Event, für das sich ein Erklärbär heute noch nicht mit „Ich bin
 * da" gemeldet hat (#338) — exakt die Bedingung, unter der der Helferplan
 * das An-/Abmelde-Banner zeigt (`app/helfer/page.tsx`: für Mitglieder
 * sichtbare Events, `isEventRunningAt`, ≥1 `ExplainerGame`). `cache()`, weil
 * `isTriggered` und `message` derselben Notification beide fragen.
 */
export const findPendingExplainerAttendanceEvent = cache(
  async (meepleId: string): Promise<{ id: string; title: string } | null> => {
    const [explainerGameCount, events] = await Promise.all([
      prisma.explainerGame.count({ where: { meepleId } }),
      findUpcomingEventsVisibleToMembers({
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
      }),
    ]);
    if (explainerGameCount === 0) return null;

    const now = new Date();
    const running = events.filter((event) => isEventRunningAt(event, now));
    if (running.length === 0) return null;

    const attending = await prisma.explainerAttendance.findMany({
      where: { meepleId, eventId: { in: running.map((event) => event.id) } },
      select: { eventId: true },
    });
    const attendingIds = new Set(attending.map((row) => row.eventId));
    const pending = running.find((event) => !attendingIds.has(event.id));
    return pending ? { id: pending.id, title: pending.title } : null;
  },
);

/** Automatisierte Notification (#338 über #339): erinnert Erklärbären bei
 * laufendem Event an die tägliche Anmeldung — der Reset um 05:00 Uhr
 * (`attendance-cleanup.ts`) lässt sie am nächsten Eventtag wieder
 * erscheinen. `temporary`: weggeklickt kommt sie nach 18 h zurück. */
export const EXPLAINER_ATTENDANCE_REMINDER: AutomatedNotificationDefinition = {
  name: "explainer-attendance-reminder",
  type: "info",
  closeable: "temporary",
  isTriggered: async ({ meepleId }) =>
    meepleId !== null &&
    (await findPendingExplainerAttendanceEvent(meepleId)) !== null,
  message: async ({ meepleId }) => {
    const event = meepleId
      ? await findPendingExplainerAttendanceEvent(meepleId)
      : null;
    return `„${event?.title ?? "Das Event"}" läuft – melde dich im Helferplan mit „Ich bin da" als Erklärbär an.`;
  },
};

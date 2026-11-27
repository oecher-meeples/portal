import { requireMember } from "@/lib/auth/session";
import { computeDayShiftBounds } from "@/lib/events/helfer-days";
import { MINUTES_PER_DAY, minutesSinceMidnight } from "@/lib/utils/time-of-day";
import { findOwnVisibleShiftBookings } from "@/lib/events/own-bookings";
import { prisma } from "@/lib/utils/prisma";
import { signedBlobUrl } from "@/lib/utils/blob-access";
import {
  findUpcomingEventsVisibleToMembers,
  isEventRunningAt,
} from "@/lib/events/upcoming";
import {
  HelferView,
  type HelferEventGroup,
  type HelferShiftRow,
} from "@/components/feature/helfer/helfer-view";
import type { HelperGuideLink } from "@/components/feature/helfer/helper-guide-downloads";
import type {
  EventDayOption,
  OwnAvailability,
} from "@/components/feature/helfer/helper-availability-form";

export default async function HelferPage() {
  const { meeple } = await requireMember();

  const events = await findUpcomingEventsVisibleToMembers({
    id: true,
    title: true,
    startsAt: true,
    endsAt: true,
    location: true,
  });
  const eventIds = events.map((event) => event.id);

  const [
    days,
    ownAvailabilities,
    explainerGameCount,
    ownAttendances,
    ownBookings,
    guideRoles,
  ] = await Promise.all([
    prisma.eventDay.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { date: "asc" },
      include: {
        shifts: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.helperAvailability.findMany({
      where: { meepleId: meeple.id, day: { eventId: { in: eventIds } } },
      include: { roles: { select: { roleId: true } } },
    }),
    prisma.explainerGame.count({ where: { meepleId: meeple.id } }),
    prisma.explainerAttendance.findMany({
      where: { meepleId: meeple.id, eventId: { in: eventIds } },
    }),
    findOwnVisibleShiftBookings(meeple.id),
    prisma.helperRole.findMany({
      where: { guideDownloadId: { not: null } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        guideDownload: { select: { fileKey: true } },
      },
    }),
  ]);

  const guides: HelperGuideLink[] = guideRoles.flatMap((role) =>
    role.guideDownload
      ? [
          {
            roleId: role.id,
            roleName: role.name,
            url: signedBlobUrl(role.guideDownload.fileKey),
          },
        ]
      : [],
  );

  const ownAvailabilityByDayId: Record<string, OwnAvailability> =
    Object.fromEntries(
      ownAvailabilities.map((availability) => [
        availability.dayId,
        {
          startsAt: availability.startsAt.toISOString(),
          endsAt: availability.endsAt.toISOString(),
          roleIds: availability.roles.map((r) => r.roleId),
          comment: availability.comment,
        },
      ]),
    );

  const attendingEventIds = new Set(ownAttendances.map((a) => a.eventId));

  const daysByEventId: Record<string, EventDayOption[]> = {};
  const dayRolesByDayId: Record<string, { id: string; name: string }[]> = {};
  for (const day of days) {
    // Tage ohne offene Schichten werden nicht angezeigt — für sie gibt es
    // nichts, wofür man Verfügbarkeit melden könnte.
    if (day.shifts.length === 0) continue;

    const forEvent = (daysByEventId[day.eventId] ??= []);
    const bounds = computeDayShiftBounds(day.shifts);
    forEvent.push({
      id: day.id,
      date: day.date.toISOString(),
      minMinutes: bounds ? minutesSinceMidnight(bounds.start.toISOString()) : 0,
      // 00:00 als Ende heißt Mitternacht des Folgetags, nicht Tagesbeginn.
      maxMinutes: bounds
        ? minutesSinceMidnight(bounds.end.toISOString()) || MINUTES_PER_DAY
        : MINUTES_PER_DAY,
    });
    const rolesById = new Map(
      day.shifts.map((shift) => [shift.role.id, shift.role]),
    );
    dayRolesByDayId[day.id] = [...rolesById.values()];
  }

  const eventGroups: HelferEventGroup[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    location: event.location,
    days: daysByEventId[event.id] ?? [],
    isAttendingAsExplainer: attendingEventIds.has(event.id),
    // #338: An-/Abmelde-Banner nur bei laufendem Event zeigen.
    isCurrentlyRunning: isEventRunningAt(event),
  }));

  const assignedShifts: HelferShiftRow[] = ownBookings.map((booking) => ({
    id: booking.shiftId,
    bookingId: booking.id,
    eventTitle: booking.shift.event.title,
    roleName: booking.shift.role.name,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
  }));

  return (
    <HelferView
      events={eventGroups}
      dayRolesByDayId={dayRolesByDayId}
      ownAvailabilityByDayId={ownAvailabilityByDayId}
      assignedShifts={assignedShifts}
      guides={guides}
      isExplainer={explainerGameCount > 0}
    />
  );
}

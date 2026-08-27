import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { findUpcomingEventsVisibleToMembers } from "@/lib/events/upcoming";
import {
  HelferView,
  type HelferEventGroup,
  type HelferShiftRow,
} from "@/components/feature/helfer/helfer-view";
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
    location: true,
  });
  const eventIds = events.map((event) => event.id);

  const [
    days,
    ownAvailabilities,
    explainerGameCount,
    ownAttendances,
    ownBookings,
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
    prisma.shiftBooking.findMany({
      where: {
        meepleId: meeple.id,
        shift: {
          event: {
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
        },
      },
      orderBy: { startsAt: "asc" },
      include: {
        shift: {
          include: {
            role: { select: { name: true } },
            event: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const ownAvailabilityByDayId: Record<string, OwnAvailability> =
    Object.fromEntries(
      ownAvailabilities.map((availability) => [
        availability.dayId,
        {
          startsAt: availability.startsAt.toISOString(),
          endsAt: availability.endsAt.toISOString(),
          roleIds: availability.roles.map((r) => r.roleId),
        },
      ]),
    );

  const attendingEventIds = new Set(ownAttendances.map((a) => a.eventId));

  const daysByEventId: Record<string, EventDayOption[]> = {};
  const dayRolesByDayId: Record<string, { id: string; name: string }[]> = {};
  for (const day of days) {
    const forEvent = (daysByEventId[day.eventId] ??= []);
    forEvent.push({ id: day.id, date: day.date.toISOString() });
    const rolesById = new Map(
      day.shifts.map((shift) => [shift.role.id, shift.role]),
    );
    dayRolesByDayId[day.id] = [...rolesById.values()];
  }

  const eventGroups: HelferEventGroup[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    location: event.location,
    days: daysByEventId[event.id] ?? [],
    isAttendingAsExplainer: attendingEventIds.has(event.id),
  }));

  const assignedShifts: HelferShiftRow[] = ownBookings.map((booking) => ({
    id: booking.shiftId,
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
      isExplainer={explainerGameCount > 0}
    />
  );
}

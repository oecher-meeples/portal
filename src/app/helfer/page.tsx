import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import {
  findUpcomingEventsVisibleToMembers,
  resolveSelectedEventId,
} from "@/lib/events/upcoming";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";
import {
  HelferView,
  type HelferEventOption,
  type HelferShiftRow,
} from "@/components/feature/helfer/helfer-view";
import type {
  EventDayOption,
  OwnAvailability,
} from "@/components/feature/helfer/helper-availability-form";

export default async function HelferPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { meeple } = await requireMember();
  const { event: requestedEventId } = await searchParams;

  const events = await findUpcomingEventsVisibleToMembers();
  const selectedEventId = resolveSelectedEventId(events, requestedEventId);

  const [
    shifts,
    explainerGameCount,
    ownAttendance,
    days,
    helperRoles,
    ownAvailabilities,
  ] = await Promise.all([
    selectedEventId
      ? prisma.shift.findMany({
          where: { eventId: selectedEventId },
          orderBy: { targetStartsAt: "asc" },
          include: { role: { select: { name: true } }, bookings: true },
        })
      : Promise.resolve([]),
    prisma.explainerGame.count({ where: { meepleId: meeple.id } }),
    selectedEventId
      ? prisma.explainerAttendance.findUnique({
          where: {
            eventId_meepleId: {
              eventId: selectedEventId,
              meepleId: meeple.id,
            },
          },
        })
      : Promise.resolve(null),
    selectedEventId
      ? prisma.eventDay.findMany({
          where: { eventId: selectedEventId },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prisma.helperRole.findMany({ orderBy: { name: "asc" } }),
    selectedEventId
      ? prisma.helperAvailability.findMany({
          where: { meepleId: meeple.id, day: { eventId: selectedEventId } },
          include: { roles: { select: { roleId: true } } },
        })
      : Promise.resolve([]),
  ]);

  const eventOptions: HelferEventOption[] = events.map((event) => ({
    id: event.id,
    title: event.title,
  }));

  const dayOptions: EventDayOption[] = days.map((day) => ({
    id: day.id,
    date: day.date.toISOString(),
  }));

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

  const shiftRows: HelferShiftRow[] = shifts.map((shift) => {
    const fillLevel = computeShiftFillLevel(shift, shift.bookings);
    const ownBooking =
      shift.bookings.find((b) => b.meepleId === meeple.id) ?? null;
    return {
      id: shift.id,
      roleName: shift.role.name,
      startsAt: shift.targetStartsAt.toISOString(),
      endsAt: shift.targetEndsAt.toISOString(),
      capacity: shift.capacity,
      booked: fillLevel.booked,
      isFull: fillLevel.isFull,
      ownBooking: ownBooking
        ? { confirmedAt: ownBooking.confirmedAt?.toISOString() ?? null }
        : null,
    };
  });

  return (
    <HelferView
      events={eventOptions}
      selectedEventId={selectedEventId}
      days={dayOptions}
      helperRoles={helperRoles}
      ownAvailabilityByDayId={ownAvailabilityByDayId}
      shifts={shiftRows}
      isExplainer={explainerGameCount > 0}
      isAttendingAsExplainer={ownAttendance !== null}
    />
  );
}

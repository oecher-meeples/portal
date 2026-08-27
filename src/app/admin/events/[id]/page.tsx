import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import {
  EventDetailView,
  type ShiftRow,
} from "@/components/feature/admin-events/event-detail-view";
import type { EditableEventDay } from "@/components/feature/admin-events/event-day-time-form";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";
import type { PlanBooking } from "@/lib/events/shift-plan-types";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("events:manage");
  const { id } = await params;

  const [event, shelves, helperRoles] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            availabilities: {
              include: {
                meeple: { select: { id: true, displayName: true } },
                roles: { select: { roleId: true } },
              },
            },
          },
        },
        shifts: {
          orderBy: { targetStartsAt: "asc" },
          include: {
            role: { select: { id: true, name: true } },
            day: { select: { date: true } },
            bookings: {
              select: {
                confirmedAt: true,
                meepleId: true,
                startsAt: true,
                endsAt: true,
                meeple: { select: { displayName: true } },
              },
            },
          },
        },
        shelfAssignments: {
          include: { unit: { select: { id: true, label: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      where: { kind: "SHELF", retiredAt: null },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
    prisma.helperRole.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!event) {
    notFound();
  }

  const days: EditableEventDay[] = event.days.map((day) => ({
    id: day.id,
    date: day.date.toISOString(),
    startsAt: day.startsAt?.toISOString() ?? null,
    endsAt: day.endsAt?.toISOString() ?? null,
  }));

  const shifts: ShiftRow[] = event.shifts.map((shift) => ({
    id: shift.id,
    dayId: shift.dayId,
    dayDate: shift.day.date.toISOString(),
    roleId: shift.role.id,
    roleName: shift.role.name,
    targetStartsAt: shift.targetStartsAt.toISOString(),
    targetEndsAt: shift.targetEndsAt.toISOString(),
    capacity: shift.capacity,
    bookings: shift.bookings,
  }));

  const bookingsByDay: Record<string, PlanBooking[]> = {};
  for (const shift of event.shifts) {
    const forDay = (bookingsByDay[shift.dayId] ??= []);
    for (const booking of shift.bookings) {
      forDay.push({
        shiftId: shift.id,
        roleId: shift.roleId,
        dayId: shift.dayId,
        meepleId: booking.meepleId,
        displayName: booking.meeple.displayName,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        confirmedAt: booking.confirmedAt?.toISOString() ?? null,
      });
    }
  }

  /** Whoever has ≥1 assignment on a day gets the yellow "bereits verplant"
   * marker in the pool bar (#161), regardless of which role it's for. */
  const plannedMeepleIdsByDay: Record<string, Set<string>> = Object.fromEntries(
    Object.entries(bookingsByDay).map(([dayId, bookings]) => [
      dayId,
      new Set(bookings.map((b) => b.meepleId)),
    ]),
  );

  const pool: Record<string, PoolMeeple[]> = Object.fromEntries(
    event.days.map((day) => [
      day.id,
      day.availabilities.flatMap((availability) =>
        availability.roles.map((role) => ({
          meepleId: availability.meeple.id,
          displayName: availability.meeple.displayName,
          roleId: role.roleId,
          alreadyPlanned:
            plannedMeepleIdsByDay[day.id]?.has(availability.meeple.id) ?? false,
        })),
      ),
    ]),
  );

  const assignedShelfIds = new Set(
    event.shelfAssignments.map((assignment) => assignment.unit.id),
  );
  const assignedShelves = event.shelfAssignments.map((assignment) => ({
    id: assignment.unit.id,
    label: assignment.unit.label,
  }));
  const availableShelves = shelves.filter(
    (shelf) => !assignedShelfIds.has(shelf.id),
  );

  return (
    <EventDetailView
      eventId={event.id}
      eventTitle={event.title}
      eventStartsAt={event.startsAt.toISOString()}
      eventEndsAt={event.endsAt?.toISOString() ?? null}
      eventLocation={event.location}
      eventHelpersWanted={event.helpersWanted}
      eventVisibility={event.visibility}
      days={days}
      shifts={shifts}
      helperRoles={helperRoles}
      pool={pool}
      bookingsByDay={bookingsByDay}
      assignedShelves={assignedShelves}
      availableShelves={availableShelves}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import {
  EventDetailView,
  type ShiftRow,
} from "@/components/feature/admin-events/event-detail-view";
import type { EditableEventDay } from "@/components/feature/admin-events/event-day-time-form";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";

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
            bookings: { select: { uncertain: true } },
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

  const pool: Record<string, PoolMeeple[]> = Object.fromEntries(
    event.days.map((day) => [
      day.id,
      day.availabilities.flatMap((availability) =>
        availability.roles.map((role) => ({
          meepleId: availability.meeple.id,
          displayName: availability.meeple.displayName,
          roleId: role.roleId,
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
      days={days}
      shifts={shifts}
      helperRoles={helperRoles}
      pool={pool}
      assignedShelves={assignedShelves}
      availableShelves={availableShelves}
    />
  );
}

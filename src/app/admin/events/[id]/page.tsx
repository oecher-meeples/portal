import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import {
  EventDetailView,
  type ShiftRow,
} from "@/components/feature/admin-events/event-detail-view";
import type { EditableEventDay } from "@/components/feature/admin-events/event-day-time-form";

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
        days: { orderBy: { date: "asc" } },
        shifts: {
          orderBy: { startsAt: "asc" },
          include: {
            role: { select: { id: true, name: true } },
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
    roleId: shift.role.id,
    roleName: shift.role.name,
    startsAt: shift.startsAt.toISOString(),
    endsAt: shift.endsAt.toISOString(),
    capacity: shift.capacity,
    bookings: shift.bookings,
  }));

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
      days={days}
      shifts={shifts}
      helperRoles={helperRoles}
      assignedShelves={assignedShelves}
      availableShelves={availableShelves}
    />
  );
}

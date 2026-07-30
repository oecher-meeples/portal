import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireAdmin } from "@/lib/auth/session";
import {
  EventDetailView,
  type ShiftRow,
} from "@/components/feature/admin-events/event-detail-view";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [event, shelves] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        shifts: {
          orderBy: { startsAt: "asc" },
          include: { bookings: { select: { uncertain: true } } },
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
  ]);

  if (!event) {
    notFound();
  }

  const shifts: ShiftRow[] = event.shifts.map((shift) => ({
    id: shift.id,
    type: shift.type,
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
      shifts={shifts}
      assignedShelves={assignedShelves}
      availableShelves={availableShelves}
    />
  );
}

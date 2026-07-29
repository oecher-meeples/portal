import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { EventDetailView, type ShiftRow } from "@/components/feature/admin-events/event-detail-view";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      shifts: {
        orderBy: { startsAt: "asc" },
        include: { bookings: { select: { uncertain: true } } },
      },
    },
  });

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

  return (
    <EventDetailView eventId={event.id} eventTitle={event.title} shifts={shifts} />
  );
}

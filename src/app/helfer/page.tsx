import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";
import {
  HelferView,
  type HelferEventOption,
  type HelferShiftRow,
} from "@/components/feature/helfer/helfer-view";

export default async function HelferPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { meeple } = await requireMember();
  const { event: requestedEventId } = await searchParams;

  const events = await prisma.event.findMany({
    where: { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true },
  });

  const selectedEventId = events.some((event) => event.id === requestedEventId)
    ? requestedEventId!
    : (events[0]?.id ?? null);

  const shifts = selectedEventId
    ? await prisma.shift.findMany({
        where: { eventId: selectedEventId },
        orderBy: { startsAt: "asc" },
        include: { bookings: true },
      })
    : [];

  const eventOptions: HelferEventOption[] = events.map((event) => ({
    id: event.id,
    title: event.title,
  }));

  const shiftRows: HelferShiftRow[] = shifts.map((shift) => {
    const fillLevel = computeShiftFillLevel(shift, shift.bookings);
    const ownBooking = shift.bookings.find((b) => b.meepleId === meeple.id) ?? null;
    return {
      id: shift.id,
      type: shift.type,
      startsAt: shift.startsAt.toISOString(),
      endsAt: shift.endsAt.toISOString(),
      capacity: shift.capacity,
      booked: fillLevel.booked,
      isFull: fillLevel.isFull,
      ownBooking: ownBooking ? { uncertain: ownBooking.uncertain } : null,
    };
  });

  return (
    <HelferView
      events={eventOptions}
      selectedEventId={selectedEventId}
      shifts={shiftRows}
    />
  );
}

import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import {
  findUpcomingEvents,
  resolveSelectedEventId,
} from "@/lib/events/upcoming";
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

  const events = await findUpcomingEvents();
  const selectedEventId = resolveSelectedEventId(events, requestedEventId);

  const [shifts, explainerGameCount, ownAttendance] = await Promise.all([
    selectedEventId
      ? prisma.shift.findMany({
          where: { eventId: selectedEventId },
          orderBy: { startsAt: "asc" },
          include: { bookings: true },
        })
      : Promise.resolve([]),
    prisma.explainerGame.count({ where: { meepleId: meeple.id } }),
    selectedEventId
      ? prisma.explainerAttendance.findUnique({
          where: {
            eventId_meepleId: { eventId: selectedEventId, meepleId: meeple.id },
          },
        })
      : Promise.resolve(null),
  ]);

  const eventOptions: HelferEventOption[] = events.map((event) => ({
    id: event.id,
    title: event.title,
  }));

  const shiftRows: HelferShiftRow[] = shifts.map((shift) => {
    const fillLevel = computeShiftFillLevel(shift, shift.bookings);
    const ownBooking =
      shift.bookings.find((b) => b.meepleId === meeple.id) ?? null;
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
      isExplainer={explainerGameCount > 0}
      isAttendingAsExplainer={ownAttendance !== null}
    />
  );
}

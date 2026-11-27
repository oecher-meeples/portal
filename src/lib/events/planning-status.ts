import type { EventVisibility, HelperPhase } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { computeCoveragePercent } from "@/lib/events/shift-plan";

/** Zeitfenster der Planungs-Cards: Events, die in höchstens so vielen Monaten
 * beginnen (#681). */
const PLANNING_HORIZON_MONTHS = 2;

export type EventPlanningStatus = {
  id: string;
  title: string;
  visibility: EventVisibility;
  helperPhase: HelperPhase;
  /** Anzahl geplanter `Shift`-Zeilen (y). */
  shiftCount: number;
  /** Zeitgewichtete Abdeckung in Prozent, `null` ohne Schichten. */
  coveragePercent: number | null;
  /** Alle `ShiftBooking`-Zeilen (b) und die bestätigten (a). */
  bookingCount: number;
  confirmedCount: number;
};

type PlanningEventRow = {
  id: string;
  title: string;
  visibility: EventVisibility;
  helperPhase: HelperPhase;
  shifts: {
    capacity: number;
    role?: { hasShifts: boolean };
    targetStartsAt: Date;
    targetEndsAt: Date;
    bookings: { startsAt: Date; endsAt: Date; confirmedAt: Date | null }[];
  }[];
};

/** Reine Verdichtung eines Events zu den Kennzahlen der Planungs-Card. */
export function summarizeEventPlanning(
  event: PlanningEventRow,
): EventPlanningStatus {
  const bookings = event.shifts.flatMap((shift) => shift.bookings);
  return {
    id: event.id,
    title: event.title,
    visibility: event.visibility,
    helperPhase: event.helperPhase,
    shiftCount: event.shifts.length,
    coveragePercent: computeCoveragePercent(
      event.shifts.map((shift) => ({
        ...shift,
        capacity: shift.role?.hasShifts === false ? 0 : shift.capacity,
      })),
    ),
    bookingCount: bookings.length,
    confirmedCount: bookings.filter((booking) => booking.confirmedAt).length,
  };
}

/**
 * Noch nicht beendete Events, die höchstens zwei Monate in der Zukunft
 * beginnen — auch ohne Schichten, nach Beginn aufsteigend (#681). "Nicht
 * beendet": `endsAt` in der Zukunft, ohne Ende zählt `startsAt`.
 */
export async function findEventPlanningStatuses(
  now = new Date(),
): Promise<EventPlanningStatus[]> {
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + PLANNING_HORIZON_MONTHS);

  const events = await prisma.event.findMany({
    where: {
      startsAt: { lte: horizon },
      OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }],
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      visibility: true,
      helperPhase: true,
      shifts: {
        select: {
          capacity: true,
          role: { select: { hasShifts: true } },
          targetStartsAt: true,
          targetEndsAt: true,
          bookings: {
            select: { startsAt: true, endsAt: true, confirmedAt: true },
          },
        },
      },
    },
  });

  return events.map(summarizeEventPlanning);
}

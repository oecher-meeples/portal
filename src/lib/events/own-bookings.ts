import { prisma } from "@/lib/utils/prisma";
import { helperPhasesAtLeast } from "@/lib/events/helper-phase";

/**
 * Where-Klausel für Zuweisungen, die ein Meeple sehen darf (#676): Event noch
 * nicht vorbei **und** in der Phase "Bestätigung angefragt". In Planungs- und
 * Helfersuch-Phase bleiben Zuweisungen ausgeblendet; `confirmedAt` bleibt
 * beim Zurückschalten erhalten, es wird nur gefiltert.
 */
export function visibleOwnBookingsWhere(meepleId: string) {
  return {
    meepleId,
    shift: {
      event: {
        helperPhase: { in: helperPhasesAtLeast("CONFIRMATION_REQUESTED") },
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    },
  };
}

/** Eigene sichtbare Zuweisungen für `/helfer`. */
export function findOwnVisibleShiftBookings(meepleId: string) {
  return prisma.shiftBooking.findMany({
    where: visibleOwnBookingsWhere(meepleId),
    orderBy: { startsAt: "asc" },
    include: {
      shift: {
        include: {
          role: { select: { name: true } },
          event: { select: { title: true } },
        },
      },
    },
  });
}

/** Anzahl eigener sichtbarer, noch unbestätigter Zuweisungen (#682) — für die
 * Dashboard-Card; dieselbe Definition von "sichtbar" wie `/helfer`. */
export function countUnconfirmedOwnBookings(meepleId: string) {
  return prisma.shiftBooking.count({
    where: { ...visibleOwnBookingsWhere(meepleId), confirmedAt: null },
  });
}

import { computeShiftCoverage } from "@/lib/events/shift-plan";

/**
 * Füllstand einer Schicht — jede Zuweisung zählt zur Kapazität, unabhängig
 * vom Bestätigungsstatus (`confirmedAt`, siehe `docs/adr/0006`). Reine
 * Funktion, damit sie sowohl im Admin-Editor (Füllstand-Anzeige) als auch
 * im Helferplan (eigene Zuweisungen) ohne Duplikat wiederverwendbar ist.
 */
export function computeShiftFillLevel(
  shift: { capacity: number },
  bookings: unknown[],
): { booked: number; capacity: number; isFull: boolean } {
  const booked = bookings.length;
  return {
    booked,
    capacity: shift.capacity,
    isFull: booked >= shift.capacity,
  };
}

/**
 * Füllstand inkl. lückenfreier Abdeckung (#677): "voll" gilt erst, wenn die
 * Anzahl erreicht ist **und** die Buchungen den Ziel-Zeitraum ohne Lücke
 * abdecken. Erreichte Anzahl bei Lücke → `hasGap` (Warnung, nicht blockierend).
 */
export function computeShiftFillStatus(
  shift: { capacity: number; targetStartsAt: Date; targetEndsAt: Date },
  bookings: { startsAt: Date; endsAt: Date }[],
): {
  booked: number;
  capacity: number;
  countReached: boolean;
  hasGap: boolean;
  isFull: boolean;
} {
  const {
    booked,
    capacity,
    isFull: countReached,
  } = computeShiftFillLevel(shift, bookings);
  const covered = computeShiftCoverage(shift, bookings);
  return {
    booked,
    capacity,
    countReached,
    hasGap: countReached && !covered,
    isFull: countReached && covered,
  };
}

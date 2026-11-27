/**
 * Liegt ein Zeitblock vollständig in der gemeldeten Verfügbarkeit (#684)?
 * Eine Definition für die Zuweisungsprüfung (`assignShiftBooking`, blockiert
 * neue Zuweisungen) und die Markierung im Schichtplan-Grid (nicht
 * blockierend, wenn die Verfügbarkeit nachträglich verkürzt wurde).
 * Ohne gemeldete Verfügbarkeit (`null`) liegt nichts darin.
 */
export function isWithinAvailability(
  block: { startsAt: Date; endsAt: Date },
  availability: { startsAt: Date; endsAt: Date } | null,
): boolean {
  if (!availability) return false;
  return (
    availability.startsAt <= block.startsAt &&
    availability.endsAt >= block.endsAt
  );
}

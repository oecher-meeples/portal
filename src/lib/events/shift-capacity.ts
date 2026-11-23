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

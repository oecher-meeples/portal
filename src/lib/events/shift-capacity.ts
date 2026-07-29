/**
 * Füllstand einer Schicht — jede Buchung zählt zur Kapazität, unabhängig
 * davon, ob sie `uncertain` ist (siehe `docs/adr/0006`/Ausführungsplan Phase 6,
 * Regel "Schicht-Kapazität"). Reine Funktion, damit sie sowohl im Admin-Editor
 * (Füllstand-Anzeige) als auch später bei der Mitglieder-Buchung (Schritt 6:
 * volle Schicht lehnt weitere Buchungen ab) ohne Duplikat wiederverwendbar ist.
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

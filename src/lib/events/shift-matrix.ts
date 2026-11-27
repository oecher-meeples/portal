import { defaultRangeForDay } from "@/lib/events/shift-defaults";
import { combineDateAndMinutes } from "@/lib/utils/time-of-day";

type MatrixDay = {
  id: string;
  date: string;
  startsAt?: string | null;
  endsAt?: string | null;
};
type MatrixShift = {
  id: string;
  dayId: string;
  roleId: string;
  bookings: unknown[];
};

export function matrixCellKey(dayId: string, roleId: string): string {
  return `${dayId}|${roleId}`;
}

/** Zellen (Tag×Rolle), für die bereits mindestens eine Schicht existiert. */
export function initialMatrixCells(shifts: MatrixShift[]): Set<string> {
  return new Set(shifts.map((s) => matrixCellKey(s.dayId, s.roleId)));
}

/**
 * Diff der Matrix (#693): neu gesetzte Zellen → Schicht mit den Öffnungszeiten
 * des Tages (Fallback 09:00–18:00); abgewählte Zellen → alle Schichten der
 * Zelle löschen. `removedBookings` zählt die dabei mitgelöschten Zuweisungen
 * für die Warnung im Dialog.
 */
export function diffShiftMatrix(
  days: MatrixDay[],
  shifts: MatrixShift[],
  checked: Set<string>,
) {
  const existing = initialMatrixCells(shifts);
  const add = [...checked]
    .filter((key) => !existing.has(key))
    .flatMap((key) => {
      const [dayId, roleId] = key.split("|");
      const day = days.find((d) => d.id === dayId);
      if (!day) return [];
      const [start, end] = defaultRangeForDay(day);
      return [
        {
          dayId,
          roleId,
          targetStartsAt: combineDateAndMinutes(day.date, start),
          targetEndsAt: combineDateAndMinutes(day.date, end),
        },
      ];
    });
  const removed = shifts.filter(
    (s) => !checked.has(matrixCellKey(s.dayId, s.roleId)),
  );
  return {
    add,
    removeShiftIds: removed.map((s) => s.id),
    removedBookings: removed.reduce((sum, s) => sum + s.bookings.length, 0),
  };
}

/** Zeilen je Event-Tag (#693): jeder Tag erscheint, auch ohne Zeilen. */
export function groupRowsByDay<
  T extends { dayId: string },
  D extends { id: string },
>(days: D[], rows: T[]): { day: D; rows: T[] }[] {
  return days.map((day) => ({
    day,
    rows: rows.filter((row) => row.dayId === day.id),
  }));
}

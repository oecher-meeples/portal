import {
  buildRoleColumns,
  buildTimeSlots,
  computeVisibleRange,
  type RoleColumnGroup,
} from "@/lib/events/shift-plan";

/** Rasterschritt des Exports — wie der Editor (30 min). */
export const EXPORT_STEP_MINUTES = 30;
const STEP_MS = EXPORT_STEP_MINUTES * 60 * 1000;

export type ExportShift = {
  dayId: string;
  roleId: string;
  roleName: string;
  capacity: number;
  targetStartsAt: Date;
  targetEndsAt: Date;
};

export type ExportBooking = {
  dayId: string;
  roleId: string;
  /** Meeple-/Gast-ID (`helperKey`) — nur gleiche Person wird verschmolzen. */
  helperId: string;
  /** Fertiger Anzeigename inkl. „ (Gast)" (`helperDisplayName`). */
  name: string;
  startsAt: Date;
  endsAt: Date;
  slotIndex: number | null;
};

export type ExportBlock = {
  column: number;
  startRow: number;
  rowSpan: number;
  label: string;
};

export type ExportGreyCell = {
  column: number;
  startRow: number;
  rowSpan: number;
};

export type ExportList = { roleName: string; names: string[]; count: number };

export type ExportDay = {
  dayId: string;
  date: Date;
  rangeStart: Date;
  /** Zeilenanfänge (je `EXPORT_STEP_MINUTES`); Zeilenzahl = `timeSlots.length`. */
  timeSlots: Date[];
  columns: RoleColumnGroup[];
  columnCount: number;
  blocks: ExportBlock[];
  greyCells: ExportGreyCell[];
  lists: ExportList[];
};

function rowOf(time: Date, rangeStart: Date): number {
  return Math.round((time.getTime() - rangeStart.getTime()) / STEP_MS);
}

/** Verschmilzt direkt aufeinanderfolgende Blöcke derselben Person je Spalte. */
function mergeAdjacent(
  blocks: (ExportBlock & { helperId: string })[],
): ExportBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.column - b.column || a.startRow - b.startRow,
  );
  const merged: (ExportBlock & { helperId: string })[] = [];
  for (const block of sorted) {
    const last = merged.at(-1);
    if (
      last &&
      last.column === block.column &&
      last.helperId === block.helperId &&
      last.startRow + last.rowSpan === block.startRow
    ) {
      last.rowSpan += block.rowSpan;
    } else {
      merged.push({ ...block });
    }
  }
  return merged.map(({ column, startRow, rowSpan, label }) => ({
    column,
    startRow,
    rowSpan,
    label,
  }));
}

/** Nicht vorgesehene Plätze: Spalte j ist in Zeile r grau, wenn weniger als
 * j+1 Stellen der Rolle dort geplant sind. */
function buildGreyCells(
  group: RoleColumnGroup,
  roleShifts: ExportShift[],
  rangeStart: Date,
  rowCount: number,
): ExportGreyCell[] {
  const cells: ExportGreyCell[] = [];
  for (let slot = 0; slot < group.capacity; slot++) {
    let runStart: number | null = null;
    const flush = (end: number) => {
      if (runStart !== null) {
        cells.push({
          column: group.startColumn + slot,
          startRow: runStart,
          rowSpan: end - runStart,
        });
        runStart = null;
      }
    };
    for (let row = 0; row < rowCount; row++) {
      const rowTime = rangeStart.getTime() + row * STEP_MS;
      const active = roleShifts
        .filter(
          (shift) =>
            shift.targetStartsAt.getTime() <= rowTime &&
            shift.targetEndsAt.getTime() >= rowTime + STEP_MS,
        )
        .reduce((sum, shift) => sum + shift.capacity, 0);
      if (active <= slot) {
        runStart ??= row;
      } else {
        flush(row);
      }
    }
    flush(rowCount);
  }
  return cells;
}

/** Spalte je Buchung: gesetzter `slotIndex`, sonst erste freie Spalte der
 * Rolle (greedy nach Startzeit). */
function placeBookings(
  group: RoleColumnGroup,
  bookings: ExportBooking[],
  rangeStart: Date,
): (ExportBlock & { helperId: string })[] {
  const columnEnds: number[] = Array.from({ length: group.capacity }, () => -1);
  const placed: (ExportBlock & { helperId: string })[] = [];
  const sorted = [...bookings].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  for (const booking of sorted) {
    const startRow = Math.max(0, rowOf(booking.startsAt, rangeStart));
    const endRow = Math.max(startRow + 1, rowOf(booking.endsAt, rangeStart));
    let slot =
      booking.slotIndex !== null &&
      booking.slotIndex >= 0 &&
      booking.slotIndex < group.capacity &&
      columnEnds[booking.slotIndex] <= startRow
        ? booking.slotIndex
        : columnEnds.findIndex((end) => end <= startRow);
    if (slot < 0) slot = columnEnds.indexOf(Math.min(...columnEnds));
    columnEnds[slot] = endRow;
    placed.push({
      column: group.startColumn + slot,
      startRow,
      rowSpan: endRow - startRow,
      label: booking.name,
      helperId: booking.helperId,
    });
  }
  return placed;
}

/**
 * Seitenmodell des Schichtplan-Exports (#697): je Event-Tag ein Raster mit
 * Rollen-Spalten, verschmolzenen Personenblöcken, grauen Feldern und den
 * Namenslisten der zugewiesenen Helfer von Rollen ohne Schichtplanung
 * (Erklärer/Aufbau/Abbau, `capacity = 0`).
 * Tage ohne Schichten entfallen. Rein, ohne Prisma/PDF.
 */
export function buildExportDays(
  days: { id: string; date: Date }[],
  shifts: ExportShift[],
  bookings: ExportBooking[],
): ExportDay[] {
  const result: ExportDay[] = [];
  for (const day of days) {
    const dayShifts = shifts.filter((shift) => shift.dayId === day.id);
    if (dayShifts.length === 0) continue;

    const gridShifts = dayShifts.filter((shift) => shift.capacity > 0);
    const listRoles = new Map<string, string>();
    for (const shift of dayShifts) {
      if (shift.capacity === 0) listRoles.set(shift.roleId, shift.roleName);
    }
    const lists: ExportList[] = [...listRoles].map(([roleId, roleName]) => {
      // Zugewiesene Helfer der Rolle (Füller, ganze Verfügbarkeit).
      const names = bookings
        .filter((b) => b.dayId === day.id && b.roleId === roleId)
        .map((b) => b.name)
        .sort((a, b) => a.localeCompare(b, "de"));
      return { roleName, names, count: names.length };
    });

    const columns = buildRoleColumns(gridShifts);
    const rangeSource = gridShifts.length > 0 ? gridShifts : dayShifts;
    const range = computeVisibleRange(day, rangeSource, { pad: false });
    const slots = buildTimeSlots(range, EXPORT_STEP_MINUTES);
    // buildTimeSlots enthält das Ende selbst — Zeilen sind die Intervalle.
    const timeSlots = slots.slice(0, -1);
    const rowCount = timeSlots.length;

    const blocks: ExportBlock[] = [];
    const greyCells: ExportGreyCell[] = [];
    for (const group of columns) {
      const roleBookings = bookings.filter(
        (b) => b.dayId === day.id && b.roleId === group.roleId,
      );
      blocks.push(
        ...mergeAdjacent(placeBookings(group, roleBookings, range.start)),
      );
      greyCells.push(
        ...buildGreyCells(
          group,
          gridShifts.filter((s) => s.roleId === group.roleId),
          range.start,
          rowCount,
        ),
      );
    }

    result.push({
      dayId: day.id,
      date: day.date,
      rangeStart: range.start,
      timeSlots,
      columns,
      columnCount: columns.reduce((sum, group) => sum + group.capacity, 0),
      blocks,
      greyCells,
      lists,
    });
  }
  return result;
}

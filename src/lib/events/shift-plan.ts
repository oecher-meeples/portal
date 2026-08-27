const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * The Schichtplan-Editor's visible time range for one day: die früheste
 * Schicht minus 1h bis zur spätesten Schicht plus 1h, damit Auf-/Abbau kurz
 * vor bzw. nach der ersten/letzten Schicht noch Platz auf dem Grid hat.
 * Ohne angelegte Schichten ein wochentagsabhängiger Default — werktags
 * 16–24 Uhr (Feierabend-Aufbau), am Wochenende 8–24 Uhr.
 */
export function computeVisibleRange(
  day: { date: Date },
  shiftsForDay: { targetStartsAt: Date; targetEndsAt: Date }[],
): { start: Date; end: Date } {
  if (shiftsForDay.length > 0) {
    const earliestStart = shiftsForDay.reduce(
      (min, shift) => (shift.targetStartsAt < min ? shift.targetStartsAt : min),
      shiftsForDay[0].targetStartsAt,
    );
    const latestEnd = shiftsForDay.reduce(
      (max, shift) => (shift.targetEndsAt > max ? shift.targetEndsAt : max),
      shiftsForDay[0].targetEndsAt,
    );
    return {
      start: new Date(earliestStart.getTime() - ONE_HOUR_MS),
      end: new Date(latestEnd.getTime() + ONE_HOUR_MS),
    };
  }

  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
  const start = new Date(day.date);
  start.setHours(isWeekend ? 8 : 16, 0, 0, 0);
  const end = new Date(day.date);
  end.setHours(24, 0, 0, 0);
  return { start, end };
}

/**
 * Überschneidung zweier Zeiträume, oder null wenn sie sich nicht
 * überschneiden — Grundlage für den Drop-Vorschau-Bereich im Schichtplan-
 * Grid (verfügbares Zeitfenster des Meeples ∩ Ziel-Zeitraum der Schicht).
 */
export function intersectTimeRanges(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): { start: Date; end: Date } | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start < end ? { start, end } : null;
}

/** Time-of-day row labels for the grid, every `stepMinutes` from `range.start` to `range.end`. */
export function buildTimeSlots(
  range: { start: Date; end: Date },
  stepMinutes = 30,
): Date[] {
  const stepMs = stepMinutes * 60 * 1000;
  const slots: Date[] = [];
  for (let t = range.start.getTime(); t <= range.end.getTime(); t += stepMs) {
    slots.push(new Date(t));
  }
  return slots;
}

export type RoleColumnGroup = {
  roleId: string;
  roleName: string;
  /** Summed `capacity` across every Shift for this role on this day — the
   * "Stellenzahl" that decides this role's column width (#157). */
  capacity: number;
  /** 0-based index of this group's first column in the overall grid. */
  startColumn: number;
};

/**
 * One column group per role present on a day, ordered as given, each
 * `capacity` columns wide — "Küche 2 Stellen + Abbau 5 Stellen" becomes a
 * 7-column grid split 2:5 (#157). Roles with the same id are summed instead
 * of creating a second group, so multiple Shift rows for the same role/day
 * (e.g. two separate target windows) still form one column group.
 */
export function buildRoleColumns(
  shiftsForDay: { roleId: string; roleName: string; capacity: number }[],
): RoleColumnGroup[] {
  const byRole = new Map<string, RoleColumnGroup>();
  for (const shift of shiftsForDay) {
    const existing = byRole.get(shift.roleId);
    if (existing) {
      existing.capacity += shift.capacity;
    } else {
      byRole.set(shift.roleId, {
        roleId: shift.roleId,
        roleName: shift.roleName,
        capacity: shift.capacity,
        startColumn: 0,
      });
    }
  }

  let column = 0;
  const groups = [...byRole.values()];
  for (const group of groups) {
    group.startColumn = column;
    column += group.capacity;
  }
  return groups;
}

export function totalColumnCount(groups: RoleColumnGroup[]): number {
  return groups.reduce((sum, group) => sum + group.capacity, 0);
}

/**
 * Whether a grid row's time slot falls inside at least one of a role's own
 * Shift target windows — with several roles on the visible range, a given
 * row can be staffable for one role's column and not another's. Cells
 * outside every window are grayed out in the Schichtplan-Editor.
 */
export function isSlotStaffable(
  slot: Date,
  shiftsForRole: { targetStartsAt: Date; targetEndsAt: Date }[],
): boolean {
  return shiftsForRole.some(
    (shift) => slot >= shift.targetStartsAt && slot < shift.targetEndsAt,
  );
}

/**
 * Turns a drag-selected pair of slot indices (Schnellanlage: Zellen in der
 * Uhrzeiten-Spalte selektieren) into the actual start/end instants for a new
 * Shift — the selection always spans full step-sized blocks, so the end
 * slot's own block is included, not just its label time.
 */
export function resolveSelectedTimeRange(
  timeSlots: Date[],
  anchorIndex: number,
  currentIndex: number,
  stepMinutes: number,
): { startsAt: Date; endsAt: Date } {
  const startIndex = Math.min(anchorIndex, currentIndex);
  const endIndex = Math.max(anchorIndex, currentIndex);
  const startsAt = timeSlots[startIndex];
  const endsAt = new Date(
    timeSlots[endIndex].getTime() + stepMinutes * 60 * 1000,
  );
  return { startsAt, endsAt };
}

/**
 * Time-based analogue of `computeShiftFillLevel` (#162): a Shift counts as
 * "voll geplant" only once its `capacity` parallel Stellen cover the whole
 * target period without gaps — at every instant within it, at least
 * `capacity` assignment blocks must be active. A count-based fill level
 * (e.g. "3 von 3 gebucht") doesn't catch two people covering the same hour
 * while another hour has nobody, so this walks a sweep line over every
 * booking boundary instead.
 */
export function computeShiftCoverage(
  shift: { targetStartsAt: Date; targetEndsAt: Date; capacity: number },
  bookings: { startsAt: Date; endsAt: Date }[],
): boolean {
  const { targetStartsAt, targetEndsAt, capacity } = shift;
  if (targetEndsAt <= targetStartsAt) return true;

  const boundaries = new Set<number>([
    targetStartsAt.getTime(),
    targetEndsAt.getTime(),
  ]);
  for (const booking of bookings) {
    const start = Math.max(
      booking.startsAt.getTime(),
      targetStartsAt.getTime(),
    );
    const end = Math.min(booking.endsAt.getTime(), targetEndsAt.getTime());
    if (end > start) {
      boundaries.add(start);
      boundaries.add(end);
    }
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    const [from, to] = [sorted[i], sorted[i + 1]];
    const active = bookings.filter(
      (b) => b.startsAt.getTime() <= from && b.endsAt.getTime() >= to,
    ).length;
    if (active < capacity) return false;
  }
  return true;
}

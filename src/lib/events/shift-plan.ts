const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * The Schichtplan-Editor's visible time range for one day (#157): the day's
 * own opening hours (set in #150) extended by 4h on each side, so setup/
 * teardown shifts outside the public hours still fit on the grid. Falls
 * back to the event's overall start/end when this day has no opening hours
 * set yet.
 */
export function computeVisibleRange(
  day: { startsAt: Date | null; endsAt: Date | null },
  event: { startsAt: Date; endsAt: Date | null },
): { start: Date; end: Date } {
  const base =
    day.startsAt && day.endsAt
      ? { start: day.startsAt, end: day.endsAt }
      : { start: event.startsAt, end: event.endsAt ?? event.startsAt };

  return {
    start: new Date(base.start.getTime() - FOUR_HOURS_MS),
    end: new Date(base.end.getTime() + FOUR_HOURS_MS),
  };
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

"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  computeVisibleRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
  type RoleColumnGroup,
} from "@/lib/events/shift-plan";
import { formatTimePlain } from "@/lib/utils/format";
import type {
  PlanDay,
  PlanShift,
  PlanBooking,
} from "@/lib/events/shift-plan-types";
import { AssignedBlock } from "@/components/feature/admin-events/assigned-block";

const STEP_MINUTES = 30;

export type RoleDropData = {
  type: "role-column";
  dayId: string;
  roleId: string;
  shiftId: string;
};

/** One role's column group, plus the specific Shift row it targets on drop —
 * only meaningful when a role has exactly one Shift row per day, the common
 * case; with several, the first is used (documented simplification, #159). */
function primaryShiftFor(group: RoleColumnGroup, shifts: PlanShift[]) {
  return shifts.find((shift) => shift.roleId === group.roleId);
}

export function ShiftPlanGrid({
  day,
  event,
  shifts,
  bookings,
  onUnassign,
  onResize,
}: {
  day: PlanDay;
  event: { startsAt: string; endsAt: string | null };
  shifts: PlanShift[];
  bookings: PlanBooking[];
  /** Entf-Taste auf einem fokussierten Block (#161 Unassign). */
  onUnassign: (shiftId: string, meepleId: string) => void;
  /** Griffpunkte oben/unten auf einem fokussierten Block (#160 Resize). */
  onResize: (
    shiftId: string,
    meepleId: string,
    startsAt: Date,
    endsAt: Date,
  ) => void;
}) {
  const range = computeVisibleRange(
    {
      startsAt: day.startsAt ? new Date(day.startsAt) : null,
      endsAt: day.endsAt ? new Date(day.endsAt) : null,
    },
    {
      startsAt: new Date(event.startsAt),
      endsAt: event.endsAt ? new Date(event.endsAt) : null,
    },
  );
  const timeSlots = buildTimeSlots(range, STEP_MINUTES);
  const columns = buildRoleColumns(shifts);
  const columnCount = totalColumnCount(columns);

  if (columnCount === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        Für diesen Tag sind noch keine Schichten angelegt.
      </p>
    );
  }

  const rowForTime = (iso: string) => {
    const offsetMs = new Date(iso).getTime() - range.start.getTime();
    return Math.round(offsetMs / (STEP_MINUTES * 60 * 1000));
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `5rem repeat(${columnCount}, minmax(4rem, 1fr))`,
          gridTemplateRows: `auto repeat(${timeSlots.length}, 2rem)`,
        }}
      >
        <div className="bg-muted/50 border-b" style={{ gridRow: 1 }} />
        {columns.map((group) => (
          <div
            key={group.roleId}
            className="bg-muted/50 border-b border-l px-2 py-1.5 text-center text-xs font-semibold"
            style={{ gridColumn: `span ${group.capacity}`, gridRow: 1 }}
          >
            {group.roleName}
          </div>
        ))}

        {timeSlots.map((slot, rowIndex) => (
          <div key={slot.toISOString()} className="contents">
            <div
              className="text-muted-foreground border-b px-2 py-1 text-right font-mono text-xs"
              style={{ gridRow: rowIndex + 2 }}
            >
              {formatTimePlain(slot.toISOString())}
            </div>
            {Array.from({ length: columnCount }, (_, index) => (
              <div
                key={index}
                className="border-b border-l"
                style={{ gridColumn: index + 2, gridRow: rowIndex + 2 }}
              />
            ))}
          </div>
        ))}

        {columns.map((group) => {
          const shift = primaryShiftFor(group, shifts);
          if (!shift) return null;
          return (
            <RoleDropZone
              key={`drop-${group.roleId}`}
              day={day}
              group={group}
              shiftId={shift.id}
              rowCount={timeSlots.length}
            />
          );
        })}

        {bookings.map((booking) => {
          const group = columns.find((g) => g.roleId === booking.roleId);
          if (!group) return null;
          const sameRole = bookings.filter((b) => b.roleId === booking.roleId);
          const slot = Math.min(
            sameRole.findIndex((b) => b.meepleId === booking.meepleId),
            group.capacity - 1,
          );
          const rowStart = Math.max(2, rowForTime(booking.startsAt) + 2);
          const rowEnd = Math.max(rowStart + 1, rowForTime(booking.endsAt) + 2);
          return (
            <AssignedBlock
              key={`${booking.shiftId}-${booking.meepleId}`}
              booking={booking}
              gridColumn={group.startColumn + 2 + Math.max(slot, 0)}
              rowStart={rowStart}
              rowEnd={rowEnd}
              maxRow={timeSlots.length + 2}
              rangeStart={range.start}
              onUnassign={onUnassign}
              onResize={onResize}
            />
          );
        })}
      </div>
    </div>
  );
}

function RoleDropZone({
  day,
  group,
  shiftId,
  rowCount,
}: {
  day: PlanDay;
  group: RoleColumnGroup;
  shiftId: string;
  rowCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `role::${day.id}::${group.roleId}`,
    data: {
      type: "role-column",
      dayId: day.id,
      roleId: group.roleId,
      shiftId,
    } satisfies RoleDropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "bg-primary/10" : undefined}
      style={{
        gridColumn: `${group.startColumn + 2} / span ${group.capacity}`,
        gridRow: `2 / span ${rowCount}`,
      }}
    />
  );
}

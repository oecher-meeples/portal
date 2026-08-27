"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  computeVisibleRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
  computeShiftCoverage,
  isSlotStaffable,
  intersectTimeRanges,
  resolveSelectedTimeRange,
  type RoleColumnGroup,
} from "@/lib/events/shift-plan";
import { formatTimePlain } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
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

/** "Voll geplant" (#162): every Shift row for this role on this day must be
 * gap-free covered by its own bookings — a role with several target windows
 * only counts once all of them are fully staffed. */
function isRoleFullyCovered(
  group: RoleColumnGroup,
  shifts: PlanShift[],
  bookings: PlanBooking[],
): boolean {
  const roleShifts = shifts.filter((shift) => shift.roleId === group.roleId);
  if (roleShifts.length === 0) return false;
  return roleShifts.every((shift) =>
    computeShiftCoverage(
      {
        targetStartsAt: new Date(shift.targetStartsAt),
        targetEndsAt: new Date(shift.targetEndsAt),
        capacity: shift.capacity,
      },
      bookings
        .filter((booking) => booking.shiftId === shift.id)
        .map((booking) => ({
          startsAt: new Date(booking.startsAt),
          endsAt: new Date(booking.endsAt),
        })),
    ),
  );
}

export function ShiftPlanGrid({
  day,
  shifts,
  bookings,
  onUnassign,
  onResize,
  onSelectRange,
  activeAvailability,
}: {
  day: PlanDay;
  shifts: PlanShift[];
  bookings: PlanBooking[];
  /** Entf-Taste bzw. sichtbarer Button auf einem fokussierten Block (#161
   * Unassign) — zielt auf die konkrete Buchung, nicht nur (shiftId, meepleId),
   * da ein Meeple mehrere Blöcke auf derselben Schicht haben kann. */
  onUnassign: (booking: PlanBooking) => void;
  /** Griffpunkte oben/unten auf einem fokussierten Block (#160 Resize). */
  onResize: (booking: PlanBooking, startsAt: Date, endsAt: Date) => void;
  /** Zellen von-bis in der Uhrzeiten-Spalte selektiert und bestätigt
   * (Schicht-Schnellanlage) — öffnet den Schicht-anlegen-Dialog mit
   * vorausgefüllter Ziel-Zeit. */
  onSelectRange: (startsAt: Date, endsAt: Date) => void;
  /** Verfügbarkeitsfenster des gerade aus dem Pool gezogenen Meeples —
   * grenzt den Hervorhebungsbereich beim Drüberziehen auf die tatsächlich
   * eintragbare Zeit ein (gemeldete Verfügbarkeit ∩ Ziel-Zeitraum der
   * Schicht), statt die ganze Spalte einheitlich zu markieren. */
  activeAvailability: {
    roleId: string;
    startsAt: string;
    endsAt: string;
  } | null;
}) {
  const [drag, setDrag] = useState<{
    anchor: number;
    current: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    function handleUp() {
      setIsDragging(false);
    }
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [isDragging]);
  const range = computeVisibleRange(
    { date: new Date(day.date) },
    shifts.map((shift) => ({
      targetStartsAt: new Date(shift.targetStartsAt),
      targetEndsAt: new Date(shift.targetEndsAt),
    })),
  );
  const timeSlots = buildTimeSlots(range, STEP_MINUTES);
  const columns = buildRoleColumns(shifts);
  const columnCount = totalColumnCount(columns);

  const targetRangesByRole = new Map<
    string,
    { targetStartsAt: Date; targetEndsAt: Date }[]
  >();
  for (const shift of shifts) {
    const list = targetRangesByRole.get(shift.roleId) ?? [];
    list.push({
      targetStartsAt: new Date(shift.targetStartsAt),
      targetEndsAt: new Date(shift.targetEndsAt),
    });
    targetRangesByRole.set(shift.roleId, list);
  }

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
    <div className="max-h-[80vh] overflow-auto rounded-lg border">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `5rem repeat(${columnCount}, minmax(4rem, 1fr))`,
          gridTemplateRows: `auto repeat(${timeSlots.length}, 2rem)`,
        }}
      >
        <div
          className="bg-muted/50 sticky top-0 z-20 border-b"
          style={{ gridRow: 1 }}
        />
        {columns.map((group) => {
          const fullyCovered = isRoleFullyCovered(group, shifts, bookings);
          return (
            <div
              key={group.roleId}
              title={
                fullyCovered ? "Voll geplant — lückenlos abgedeckt" : undefined
              }
              className={`sticky top-0 z-20 border-b border-l px-2 py-1.5 text-center text-xs font-semibold ${
                fullyCovered
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted/50"
              }`}
              style={{ gridColumn: `span ${group.capacity}`, gridRow: 1 }}
            >
              {group.roleName}
            </div>
          );
        })}

        {timeSlots.map((slot, rowIndex) => {
          const selected =
            drag !== null &&
            rowIndex >= Math.min(drag.anchor, drag.current) &&
            rowIndex <= Math.max(drag.anchor, drag.current);
          return (
            <div key={slot.toISOString()} className="contents">
              <div
                className={cn(
                  "text-muted-foreground border-b px-2 py-1 text-right font-mono text-xs select-none",
                  "hover:bg-primary/10 cursor-pointer",
                  selected && "bg-primary/15",
                )}
                style={{ gridRow: rowIndex + 2 }}
                onMouseDown={() => {
                  setDrag({ anchor: rowIndex, current: rowIndex });
                  setIsDragging(true);
                }}
                onMouseEnter={() => {
                  if (!isDragging) return;
                  setDrag((current) =>
                    current ? { ...current, current: rowIndex } : current,
                  );
                }}
              >
                {formatTimePlain(slot.toISOString())}
              </div>
              {columns.flatMap((group) => {
                const staffable = isSlotStaffable(
                  slot,
                  targetRangesByRole.get(group.roleId) ?? [],
                );
                return Array.from({ length: group.capacity }, (_, index) => (
                  <div
                    key={`${group.roleId}-${index}`}
                    className={cn(
                      "border-b border-l",
                      !staffable && "bg-muted/40",
                    )}
                    style={{
                      gridColumn: group.startColumn + 2 + index,
                      gridRow: rowIndex + 2,
                    }}
                  />
                ));
              })}
            </div>
          );
        })}

        {columns.map((group) => {
          const shift = primaryShiftFor(group, shifts);
          if (!shift) return null;

          // Hervorhebungsbereich beim Drüberziehen: gemeldete Verfügbarkeit
          // des gezogenen Meeples ∩ Ziel-Zeitraum der Schicht dieser Spalte —
          // nur relevant, wenn der Drag überhaupt zu dieser Rolle gehört.
          let highlightRows: { rowStart: number; rowEnd: number } | null = null;
          if (
            activeAvailability &&
            activeAvailability.roleId === group.roleId &&
            activeAvailability.startsAt &&
            activeAvailability.endsAt
          ) {
            const overlap = intersectTimeRanges(
              {
                start: new Date(activeAvailability.startsAt),
                end: new Date(activeAvailability.endsAt),
              },
              {
                start: new Date(shift.targetStartsAt),
                end: new Date(shift.targetEndsAt),
              },
            );
            if (overlap) {
              const rowStart = Math.max(
                2,
                rowForTime(overlap.start.toISOString()) + 2,
              );
              const rowEnd = Math.max(
                rowStart + 1,
                rowForTime(overlap.end.toISOString()) + 2,
              );
              highlightRows = { rowStart, rowEnd };
            }
          }

          return (
            <RoleDropZone
              key={`drop-${group.roleId}`}
              day={day}
              group={group}
              shiftId={shift.id}
              rowCount={timeSlots.length}
              highlightRows={highlightRows}
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
              key={booking.id}
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

        {drag &&
          !isDragging &&
          (() => {
            const { startsAt, endsAt } = resolveSelectedTimeRange(
              timeSlots,
              drag.anchor,
              drag.current,
              STEP_MINUTES,
            );
            return (
              <div
                className="bg-popover text-popover-foreground z-10 flex items-center gap-2 self-start justify-self-start rounded-md border px-3 py-1.5 text-xs shadow-md"
                style={{
                  gridColumn: "1 / -1",
                  gridRow: Math.min(drag.anchor, drag.current) + 2,
                }}
              >
                <span>
                  Schicht für {formatTimePlain(startsAt.toISOString())}–
                  {formatTimePlain(endsAt.toISOString())} anlegen?
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    onSelectRange(startsAt, endsAt);
                    setDrag(null);
                  }}
                >
                  Anlegen
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Auswahl verwerfen"
                  onClick={() => setDrag(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function RoleDropZone({
  day,
  group,
  shiftId,
  rowCount,
  highlightRows,
}: {
  day: PlanDay;
  group: RoleColumnGroup;
  shiftId: string;
  rowCount: number;
  /** Nur dieser Zeilenbereich wird beim Drüberziehen hervorgehoben —
   * fehlt er (kein passender Drag oder keine Überschneidung), bleibt die
   * Spalte beim Hovern unmarkiert statt komplett einheitlich zu leuchten. */
  highlightRows: { rowStart: number; rowEnd: number } | null;
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
    <>
      <div
        ref={setNodeRef}
        style={{
          gridColumn: `${group.startColumn + 2} / span ${group.capacity}`,
          gridRow: `2 / span ${rowCount}`,
        }}
      />
      {isOver && highlightRows && (
        <div
          className="bg-primary/15 pointer-events-none"
          style={{
            gridColumn: `${group.startColumn + 2} / span ${group.capacity}`,
            gridRow: `${highlightRows.rowStart} / ${highlightRows.rowEnd}`,
          }}
        />
      )}
    </>
  );
}

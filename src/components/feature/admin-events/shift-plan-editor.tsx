"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateMedium } from "@/lib/utils/format";
import { helperColorClass } from "@/lib/events/helper-colors";
import type {
  PlanDay,
  PlanShift,
  PlanBooking,
} from "@/lib/events/shift-plan-types";
import {
  HelperPoolBar,
  type PoolMeeple,
  type PoolDragData,
} from "@/components/feature/admin-events/helper-pool-bar";
import {
  ShiftPlanGrid,
  type RoleDropData,
} from "@/components/feature/admin-events/shift-plan-grid";
import {
  assignHelperToShift,
  unassignHelperFromShift,
} from "@/components/feature/admin-events/shift-plan-actions";
import { buildRoleColumns } from "@/lib/events/shift-plan";
import {
  ShiftDialog,
  type HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import { timeInputValue } from "@/components/ui/time-picker";

export type { PlanDay, PlanShift };

type ActiveDrag = { meepleId: string; displayName: string } | null;

/**
 * Outlook-artiger Schichtplan-Kalender (#157–#161) — Tab pro Event-Tag,
 * Helferpool-Leiste synchron zum Kalender-Spaltenraster darüber, Drag&Drop
 * eines Pool-Helfers auf eine Rollen-Spalte (@dnd-kit) legt eine Zuweisung
 * mit dem Ziel-Zeitraum der Schicht an. Der Pool-Eintrag bleibt danach
 * sichtbar und wird gelb markiert, solange die Person an diesem Tag
 * mindestens eine Zuweisung hat (`alreadyPlanned`); Entf-Taste auf einem
 * fokussierten Block entfernt die Zuweisung wieder, dessen Griffpunkte
 * oben/unten strecken/stauchen den Zeitblock (#160 Resize) — beide Pfade
 * teilen sich dieselbe serverseitige Validierung (assignHelperToShift).
 */
export function ShiftPlanEditor({
  eventId,
  days,
  event,
  shifts,
  helperRoles,
  pool,
  bookings,
}: {
  eventId: string;
  days: PlanDay[];
  event: { startsAt: string; endsAt: string | null };
  shifts: PlanShift[];
  helperRoles: HelperRoleOption[];
  pool: Record<string, PoolMeeple[]>;
  bookings: Record<string, PlanBooking[]>;
}) {
  const router = useRouter();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [error, setError] = useState<string | null>(null);
  /** Aus einer Zellen-Auswahl im Grid heraus programmatisch geöffneter
   * Schicht-anlegen-Dialog (Schnellanlage), vorausgefüllt mit Tag + Ziel-
   * Zeit der Auswahl. */
  const [pendingRange, setPendingRange] = useState<{
    dayId: string;
    startsAt: Date;
    endsAt: Date;
  } | null>(null);

  if (days.length === 0) return null;

  function handleDragStart(dragEvent: DragStartEvent) {
    const data = dragEvent.active.data.current as PoolDragData | undefined;
    if (!data) return;
    setActiveDrag({ meepleId: data.meepleId, displayName: data.displayName });
    setError(null);
  }

  async function handleDragEnd(dragEvent: DragEndEvent) {
    setActiveDrag(null);
    const dragData = dragEvent.active.data.current as PoolDragData | undefined;
    const dropData = dragEvent.over?.data.current as RoleDropData | undefined;
    if (!dragData || !dropData) return;

    if (
      dragData.roleId !== dropData.roleId ||
      dragData.dayId !== dropData.dayId
    ) {
      setError("Diese Rolle passt nicht zur Ziel-Spalte.");
      return;
    }

    const shift = shifts.find((s) => s.id === dropData.shiftId);
    if (!shift) return;

    // The block defaults to the Shift's own target period; the resize
    // handles (#160) narrow it afterwards.
    const result = await assignHelperToShift(
      dropData.shiftId,
      dragData.meepleId,
      new Date(shift.targetStartsAt),
      new Date(shift.targetEndsAt),
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleUnassign(shiftId: string, meepleId: string) {
    setError(null);
    const result = await unassignHelperFromShift(shiftId, meepleId);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleResize(
    shiftId: string,
    meepleId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    setError(null);
    // Re-uses assignHelperToShift: an upsert with the same hard validations
    // (availability boundary, no overlap with the person's other blocks).
    const result = await assignHelperToShift(
      shiftId,
      meepleId,
      startsAt,
      endsAt,
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <DndContext
      id="shift-plan-editor"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Tabs defaultValue={days[0].id}>
        <TabsList variant="line">
          {days.map((day) => (
            <TabsTrigger key={day.id} value={day.id}>
              {formatDateMedium(day.date)}
            </TabsTrigger>
          ))}
        </TabsList>
        {days.map((day) => {
          const dayShifts = shifts.filter((shift) => shift.dayId === day.id);
          const columns = buildRoleColumns(dayShifts);
          return (
            <TabsContent
              key={day.id}
              value={day.id}
              className="flex flex-col gap-2"
            >
              <div className="flex justify-end">
                <ShiftDialog
                  eventId={eventId}
                  helperRoles={helperRoles}
                  days={days}
                  defaultDayId={day.id}
                />
              </div>
              {pendingRange?.dayId === day.id && (
                <ShiftDialog
                  eventId={eventId}
                  helperRoles={helperRoles}
                  days={days}
                  defaultDayId={day.id}
                  defaultStartTime={timeInputValue(
                    pendingRange.startsAt.toISOString(),
                  )}
                  defaultEndTime={timeInputValue(
                    pendingRange.endsAt.toISOString(),
                  )}
                  open
                  onOpenChange={(open) => {
                    if (!open) setPendingRange(null);
                  }}
                />
              )}
              <HelperPoolBar
                dayId={day.id}
                columns={columns}
                pool={pool[day.id] ?? []}
                activeMeepleId={activeDrag?.meepleId ?? null}
              />
              <ShiftPlanGrid
                day={day}
                event={event}
                shifts={dayShifts}
                bookings={bookings[day.id] ?? []}
                onUnassign={handleUnassign}
                onResize={handleResize}
                onSelectRange={(startsAt, endsAt) =>
                  setPendingRange({ dayId: day.id, startsAt, endsAt })
                }
              />
            </TabsContent>
          );
        })}
      </Tabs>
      <DragOverlay>
        {activeDrag && (
          <span
            className={`rounded px-2 py-1 text-xs font-medium shadow-lg ${helperColorClass(activeDrag.meepleId)}`}
          >
            {activeDrag.displayName}
          </span>
        )}
      </DragOverlay>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </DndContext>
  );
}

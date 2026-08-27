"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import {
  buildRoleColumns,
  intersectTimeRanges,
  findFirstFreeSubRange,
} from "@/lib/events/shift-plan";
import {
  ShiftDialog,
  type HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import { timeInputValue } from "@/components/ui/time-picker";

export type { PlanDay, PlanShift };

type ActiveDrag = {
  meepleId: string;
  displayName: string;
  roleId: string;
  startsAt: string;
  endsAt: string;
} | null;

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
  shifts,
  helperRoles,
  pool,
  bookings,
}: {
  eventId: string;
  days: PlanDay[];
  shifts: PlanShift[];
  helperRoles: HelperRoleOption[];
  pool: Record<string, PoolMeeple[]>;
  bookings: Record<string, PlanBooking[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Ausgewählter Tag steht in der URL (?tag=<dayId>), damit ein Reload auf
  // demselben Tag landet statt immer auf dem ersten.
  const [selectedDayId, setSelectedDayId] = useState(() => {
    const fromUrl = searchParams.get("tag");
    return fromUrl && days.some((day) => day.id === fromUrl)
      ? fromUrl
      : (days[0]?.id ?? "");
  });
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
    const entry = pool[data.dayId]?.find(
      (candidate) =>
        candidate.meepleId === data.meepleId &&
        candidate.roleId === data.roleId,
    );
    setActiveDrag({
      meepleId: data.meepleId,
      displayName: data.displayName,
      roleId: data.roleId,
      startsAt: entry?.availabilityStartsAt ?? "",
      endsAt: entry?.availabilityEndsAt ?? "",
    });
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

    // Default block darf nicht einfach der volle Ziel-Zeitraum der Schicht
    // sein — reicht die gemeldete Verfügbarkeit dieser Person nicht so weit,
    // schlägt die serverseitige Prüfung sonst mit einer für die Admin kaum
    // nachvollziehbaren Fehlermeldung fehl (Bugreport). Also erst auf die
    // Schnittmenge mit der eigenen Verfügbarkeit einengen.
    const poolEntry = pool[dropData.dayId]?.find(
      (candidate) =>
        candidate.meepleId === dragData.meepleId &&
        candidate.roleId === dragData.roleId,
    );
    const targetRange = {
      start: new Date(shift.targetStartsAt),
      end: new Date(shift.targetEndsAt),
    };
    const availableRange = poolEntry
      ? intersectTimeRanges(targetRange, {
          start: new Date(poolEntry.availabilityStartsAt),
          end: new Date(poolEntry.availabilityEndsAt),
        })
      : targetRange;
    if (!availableRange) {
      setError("Der Zeitblock liegt außerhalb der gemeldeten Verfügbarkeit.");
      return;
    }

    // Default block: die früheste noch freie Lücke im verfügbaren Zeitraum
    // — nicht immer "nach dem letzten Block", denn eine zweite Zuweisung
    // derselben Person kann genauso gut *vor* einer bestehenden fehlen
    // (z. B. "Tobias am Anfang und am Ende"). Ohne (passende) Vorbelegung
    // bleibt es beim vollen verfügbaren Zeitraum, die Resize-Griffe (#160)
    // engen ihn danach weiter ein.
    const existingForShift = (bookings[dropData.dayId] ?? []).filter(
      (booking) => booking.shiftId === dropData.shiftId,
    );
    const freeRange = findFirstFreeSubRange(
      availableRange,
      existingForShift.map((booking) => ({
        start: new Date(booking.startsAt),
        end: new Date(booking.endsAt),
      })),
    );
    if (!freeRange) {
      setError(
        "Für diese Schicht ist im verfügbaren Zeitraum kein freier Abschnitt mehr übrig.",
      );
      return;
    }

    const result = await assignHelperToShift(
      dropData.shiftId,
      dragData.meepleId,
      freeRange.start,
      freeRange.end,
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleUnassign(booking: PlanBooking) {
    setError(null);
    const result = await unassignHelperFromShift(booking.id, booking.shiftId);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleResize(
    booking: PlanBooking,
    startsAt: Date,
    endsAt: Date,
  ) {
    setError(null);
    // Re-uses assignHelperToShift: dieselben harten Validierungen
    // (Verfügbarkeits-Grenze, keine Überschneidung mit anderen Blöcken der
    // Person) — bookingId sorgt dafür, dass genau dieser Block umterminiert
    // wird statt ein neuer zu entstehen.
    const result = await assignHelperToShift(
      booking.shiftId,
      booking.meepleId,
      startsAt,
      endsAt,
      booking.id,
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleMove(
    booking: PlanBooking,
    startsAt: Date,
    endsAt: Date,
    slotIndex: number,
  ) {
    setError(null);
    // Zeit und Spalte in einem Rutsch: Zeit läuft über dieselbe Validierung
    // wie Resize, die Spalte ist rein optisch und wird nur mitgeschrieben.
    const result = await assignHelperToShift(
      booking.shiftId,
      booking.meepleId,
      startsAt,
      endsAt,
      booking.id,
      slotIndex,
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function handleDayChange(dayId: string) {
    setSelectedDayId(dayId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tag", dayId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DndContext
      id="shift-plan-editor"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Tabs value={selectedDayId} onValueChange={handleDayChange}>
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
                shifts={dayShifts}
                bookings={bookings[day.id] ?? []}
                onUnassign={handleUnassign}
                onResize={handleResize}
                onMove={handleMove}
                onSelectRange={(startsAt, endsAt) =>
                  setPendingRange({ dayId: day.id, startsAt, endsAt })
                }
                activeAvailability={
                  activeDrag
                    ? {
                        roleId: activeDrag.roleId,
                        startsAt: activeDrag.startsAt,
                        endsAt: activeDrag.endsAt,
                      }
                    : null
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

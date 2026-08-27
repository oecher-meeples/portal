"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  computeVisibleRange,
  buildTimeSlots,
  buildRoleColumns,
  totalColumnCount,
} from "@/lib/events/shift-plan";
import { formatDateMedium, formatTimePlain } from "@/lib/utils/format";

export type PlanDay = {
  id: string;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type PlanShift = {
  dayId: string;
  roleId: string;
  roleName: string;
  capacity: number;
};

/**
 * Outlook-artiger Schichtplan-Kalender (#157) — ein Tab pro Event-Tag,
 * Spalten je Rolle (Breite proportional zur Stellenzahl), Zeilen = Uhrzeit
 * im Bereich Tages-Öffnungszeit ±4h. Liefert hier nur das statische Gerüst:
 * Helferpool-Leiste, Drag&Drop und Resize sind eigene Sub-Issues (#158–#160).
 */
export function ShiftPlanEditor({
  days,
  event,
  shifts,
}: {
  days: PlanDay[];
  event: { startsAt: string; endsAt: string | null };
  shifts: PlanShift[];
}) {
  if (days.length === 0) return null;

  return (
    <Tabs defaultValue={days[0].id}>
      <TabsList variant="line">
        {days.map((day) => (
          <TabsTrigger key={day.id} value={day.id}>
            {formatDateMedium(day.date)}
          </TabsTrigger>
        ))}
      </TabsList>
      {days.map((day) => (
        <TabsContent key={day.id} value={day.id}>
          <DayGrid
            day={day}
            event={event}
            shifts={shifts.filter((shift) => shift.dayId === day.id)}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DayGrid({
  day,
  event,
  shifts,
}: {
  day: PlanDay;
  event: { startsAt: string; endsAt: string | null };
  shifts: PlanShift[];
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
  const timeSlots = buildTimeSlots(range, 30);
  const columns = buildRoleColumns(shifts);
  const columnCount = totalColumnCount(columns);

  if (columnCount === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        Für diesen Tag sind noch keine Schichten angelegt.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `5rem repeat(${columnCount}, minmax(4rem, 1fr))`,
        }}
      >
        <div className="bg-muted/50 border-b" />
        {columns.map((group) => (
          <div
            key={group.roleId}
            className="bg-muted/50 border-b border-l px-2 py-1.5 text-center text-xs font-semibold"
            style={{ gridColumn: `span ${group.capacity}` }}
          >
            {group.roleName}
          </div>
        ))}

        {timeSlots.map((slot) => (
          <div key={slot.toISOString()} className="contents">
            <div className="text-muted-foreground border-b px-2 py-1 text-right font-mono text-xs">
              {formatTimePlain(slot.toISOString())}
            </div>
            {Array.from({ length: columnCount }, (_, index) => (
              <div
                key={index}
                className="hover:bg-muted/30 h-8 border-b border-l"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

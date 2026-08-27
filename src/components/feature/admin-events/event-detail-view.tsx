import type { EventVisibility } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";
import {
  ShiftDialog,
  type EditableShift,
  type HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import { deleteShift } from "@/components/feature/admin-events/shift-actions";
import {
  ShelfAssignmentSection,
  type ShelfOption,
} from "@/components/feature/admin-events/shelf-assignment-section";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";
import { formatDateMedium, formatDateTimeRange } from "@/lib/utils/format";
import {
  EventDayTimeForm,
  type EditableEventDay,
} from "@/components/feature/admin-events/event-day-time-form";
import { ShiftPlanEditor } from "@/components/feature/admin-events/shift-plan-editor";
import type { PlanShift, PlanBooking } from "@/lib/events/shift-plan-types";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";

export type ShiftRow = EditableShift & {
  dayDate: string;
  bookings: { uncertain: boolean }[];
};

export function EventDetailView({
  eventId,
  eventTitle,
  eventStartsAt,
  eventEndsAt,
  eventLocation,
  eventHelpersWanted,
  eventVisibility,
  days,
  shifts,
  helperRoles,
  pool,
  bookingsByDay,
  assignedShelves,
  availableShelves,
}: {
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventEndsAt: string | null;
  eventLocation: string | null;
  eventHelpersWanted: boolean;
  eventVisibility: EventVisibility;
  days: EditableEventDay[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
  pool: Record<string, PoolMeeple[]>;
  bookingsByDay: Record<string, PlanBooking[]>;
  assignedShelves: ShelfOption[];
  availableShelves: ShelfOption[];
}) {
  const planShifts: PlanShift[] = shifts.map((shift) => ({
    id: shift.id,
    dayId: shift.dayId,
    roleId: shift.roleId,
    roleName: shift.roleName,
    capacity: shift.capacity,
    targetStartsAt: shift.targetStartsAt,
    targetEndsAt: shift.targetEndsAt,
  }));
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title={eventTitle}
        description="Schichten mit Zeitfenster, Kapazität und Füllstand."
        action={
          <EventDialog
            event={{
              id: eventId,
              title: eventTitle,
              startsAt: eventStartsAt,
              endsAt: eventEndsAt,
              location: eventLocation,
              helpersWanted: eventHelpersWanted,
              visibility: eventVisibility,
            }}
          />
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Öffnungszeiten je Tag</h2>
        {days.map((day) => (
          <EventDayTimeForm key={day.id} day={day} />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tag</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Ziel-Zeitraum</TableHead>
              <TableHead>Füllstand</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground text-center"
                >
                  Noch keine Schichten angelegt.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => {
                const fillLevel = computeShiftFillLevel(shift, shift.bookings);
                return (
                  <TableRow key={shift.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateMedium(shift.dayDate)}
                    </TableCell>
                    <TableCell>{shift.roleName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeRange(
                        shift.targetStartsAt,
                        shift.targetEndsAt,
                      )}
                    </TableCell>
                    <TableCell>
                      {fillLevel.isFull ? (
                        <StatusPill label="voll" tone="warning" />
                      ) : (
                        <span>
                          {fillLevel.booked} / {fillLevel.capacity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ShiftDialog
                        eventId={eventId}
                        shift={shift}
                        helperRoles={helperRoles}
                        days={days}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Schicht löschen"
                        confirm="Schicht wirklich löschen?"
                        action={deleteShift.bind(null, shift.id)}
                      >
                        <Trash2 className="size-4" />
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold">Schichtplan</h2>
        <ShiftPlanEditor
          eventId={eventId}
          days={days}
          event={{ startsAt: eventStartsAt, endsAt: eventEndsAt }}
          shifts={planShifts}
          helperRoles={helperRoles}
          pool={pool}
          bookings={bookingsByDay}
        />
      </div>

      <ShelfAssignmentSection
        eventId={eventId}
        assignedShelves={assignedShelves}
        availableShelves={availableShelves}
      />
    </div>
  );
}

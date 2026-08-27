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

export type ShiftRow = EditableShift & {
  dayDate: string;
  bookings: { uncertain: boolean }[];
};

export function EventDetailView({
  eventId,
  eventTitle,
  days,
  shifts,
  helperRoles,
  assignedShelves,
  availableShelves,
}: {
  eventId: string;
  eventTitle: string;
  days: EditableEventDay[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
  assignedShelves: ShelfOption[];
  availableShelves: ShelfOption[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title={eventTitle}
        description="Schichten mit Zeitfenster, Kapazität und Füllstand."
        action={
          <ShiftDialog
            eventId={eventId}
            helperRoles={helperRoles}
            days={days}
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

      <ShelfAssignmentSection
        eventId={eventId}
        assignedShelves={assignedShelves}
        availableShelves={availableShelves}
      />
    </div>
  );
}

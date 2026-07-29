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
import { ShiftDialog, SHIFT_TYPE_LABELS, type EditableShift } from "@/components/feature/admin-events/shift-dialog";
import { DeleteShiftButton } from "@/components/feature/admin-events/delete-shift-button";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

export type ShiftRow = EditableShift & {
  bookings: { uncertain: boolean }[];
};

export function EventDetailView({
  eventId,
  eventTitle,
  shifts,
}: {
  eventId: string;
  eventTitle: string;
  shifts: ShiftRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title={eventTitle}
        description="Schichten mit Zeitfenster, Kapazität und Füllstand."
        action={<ShiftDialog eventId={eventId} />}
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Typ</TableHead>
              <TableHead>Zeitfenster</TableHead>
              <TableHead>Füllstand</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center">
                  Noch keine Schichten angelegt.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => {
                const fillLevel = computeShiftFillLevel(shift, shift.bookings);
                return (
                  <TableRow key={shift.id}>
                    <TableCell>{SHIFT_TYPE_LABELS[shift.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateTime.format(new Date(shift.startsAt))} –{" "}
                      {dateTime.format(new Date(shift.endsAt))}
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
                      <ShiftDialog eventId={eventId} shift={shift} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteShiftButton shiftId={shift.id} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

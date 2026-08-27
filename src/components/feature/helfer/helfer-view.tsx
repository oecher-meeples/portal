"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/components/ui/use-action";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  confirmOwnShiftBooking,
  declineOwnShiftBooking,
} from "@/components/feature/helfer/actions";
import {
  markAttending,
  markNotAttending,
} from "@/components/feature/helfer/attendance-actions";
import {
  HelperAvailabilityForm,
  type EventDayOption,
  type HelperRoleOption,
  type OwnAvailability,
} from "@/components/feature/helfer/helper-availability-form";
import { formatDateTimeRange } from "@/lib/utils/format";

export type HelferShiftRow = {
  id: string;
  roleName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  isFull: boolean;
  ownBooking: { confirmedAt: string | null } | null;
};

export type HelferEventOption = {
  id: string;
  title: string;
};

export function HelferView({
  events,
  selectedEventId,
  days,
  helperRoles,
  ownAvailabilityByDayId,
  shifts,
  isExplainer,
  isAttendingAsExplainer,
}: {
  events: HelferEventOption[];
  selectedEventId: string | null;
  days: EventDayOption[];
  helperRoles: HelperRoleOption[];
  ownAvailabilityByDayId: Record<string, OwnAvailability>;
  shifts: HelferShiftRow[];
  isExplainer: boolean;
  isAttendingAsExplainer: boolean;
}) {
  const router = useRouter();
  const { run, pending: isPending, error } = useAction();
  const assignedShifts = shifts.filter((shift) => shift.ownBooking !== null);

  function selectEvent(eventId: string) {
    router.push(`/helfer?event=${eventId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Helferplan"
        description="Melde deine Verfügbarkeit und bestätige zugewiesene Schichten."
      />

      {events.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <Button
              key={event.id}
              size="sm"
              variant={event.id === selectedEventId ? "default" : "outline"}
              onClick={() => selectEvent(event.id)}
            >
              {event.title}
            </Button>
          ))}
        </div>
      )}

      {selectedEventId && days.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-bold">Deine Verfügbarkeit</h2>
          {days.map((day) => (
            <HelperAvailabilityForm
              key={day.id}
              day={day}
              helperRoles={helperRoles}
              own={ownAvailabilityByDayId[day.id] ?? null}
            />
          ))}
        </div>
      )}

      {isExplainer && selectedEventId && (
        <div className="bg-primary/10 flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm">
          <span>
            {isAttendingAsExplainer
              ? "Du bist heute als Erklärbär angemeldet."
              : "Du kannst dich für dieses Event als Erklärbär anmelden."}
          </span>
          <Button
            size="sm"
            variant={isAttendingAsExplainer ? "outline" : "default"}
            disabled={isPending}
            onClick={() =>
              run(() =>
                isAttendingAsExplainer
                  ? markNotAttending(selectedEventId)
                  : markAttending(selectedEventId),
              )
            }
          >
            {isAttendingAsExplainer
              ? "Abmelden"
              : "Ich bin heute als Erklärbär da"}
          </Button>
        </div>
      )}

      {assignedShifts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-bold">
            Deine zugewiesenen Schichten
          </h2>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Typ</TableHead>
                  <TableHead>Zeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedShifts.map((shift) => {
                  const confirmed = shift.ownBooking!.confirmedAt !== null;
                  return (
                    <TableRow key={shift.id} className="bg-primary/5">
                      <TableCell className="font-medium">
                        {shift.roleName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatDateTimeRange(shift.startsAt, shift.endsAt)}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          label={confirmed ? "bestätigt" : "unbestätigt"}
                          tone={confirmed ? "positive" : "warning"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!confirmed && (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() =>
                                run(() => confirmOwnShiftBooking(shift.id))
                              }
                            >
                              Bestätigen
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              run(() => declineOwnShiftBooking(shift.id))
                            }
                          >
                            Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

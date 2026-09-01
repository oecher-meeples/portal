"use client";

import { useAction } from "@/components/ui/use-action";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { PageContainer } from "@/components/ui/page-container";
import {
  formatDateMedium,
  formatWeekdayDateTimeRange,
} from "@/lib/utils/format";

export type HelferShiftRow = {
  /** Shift-Id, für Bestätigen/Ablehnen — nicht eindeutig pro Zeile, da ein
   * Meeple mehrfach in derselben Schicht eingetragen sein kann. */
  id: string;
  /** Eigene Buchungs-Id, als React-Key. */
  bookingId: string;
  eventTitle: string;
  roleName: string;
  startsAt: string;
  endsAt: string;
  confirmedAt: string | null;
};

export type HelferEventGroup = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  days: EventDayOption[];
  isAttendingAsExplainer: boolean;
};

export function HelferView({
  events,
  dayRolesByDayId,
  ownAvailabilityByDayId,
  assignedShifts,
  isExplainer,
}: {
  events: HelferEventGroup[];
  dayRolesByDayId: Record<string, HelperRoleOption[]>;
  ownAvailabilityByDayId: Record<string, OwnAvailability>;
  assignedShifts: HelferShiftRow[];
  isExplainer: boolean;
}) {
  const { run, pending: isPending, error } = useAction();

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Helferplan"
        description="Melde deine Verfügbarkeit und bestätige zugewiesene Schichten."
      />

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aktuell ist kein Event geplant.
        </p>
      ) : (
        <Accordion defaultValue={[events[0].id]}>
          {events.map((event) => (
            <AccordionItem
              key={event.id}
              value={event.id}
              className="bg-card overflow-hidden rounded-lg border"
            >
              <AccordionTrigger className="hover:bg-muted/50 rounded-none px-4 py-3 hover:no-underline">
                <span className="flex flex-wrap items-baseline gap-2 text-left">
                  <span className="font-serif text-base font-bold">
                    {event.title}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateMedium(event.startsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <div className="flex flex-col px-4">
                  {event.days.map((day) => (
                    <HelperAvailabilityForm
                      key={day.id}
                      day={day}
                      dayRoles={dayRolesByDayId[day.id] ?? []}
                      own={ownAvailabilityByDayId[day.id] ?? null}
                    />
                  ))}

                  {isExplainer && (
                    <div className="bg-primary/10 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm">
                      <span>
                        {event.isAttendingAsExplainer
                          ? "Du bist zu diesem Event als Erklärbär angemeldet."
                          : "Du kannst dich für dieses Event als Erklärbär anmelden."}
                      </span>
                      <Button
                        size="sm"
                        variant={
                          event.isAttendingAsExplainer ? "outline" : "default"
                        }
                        disabled={isPending}
                        onClick={() =>
                          run(() =>
                            event.isAttendingAsExplainer
                              ? markNotAttending(event.id)
                              : markAttending(event.id),
                          )
                        }
                      >
                        {event.isAttendingAsExplainer
                          ? "Abmelden"
                          : "Ich bin da"}
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
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
                  <TableHead>Event</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Zeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedShifts.map((shift) => {
                  const confirmed = shift.confirmedAt !== null;
                  return (
                    <TableRow key={shift.bookingId} className="bg-primary/5">
                      <TableCell className="text-muted-foreground">
                        {shift.eventTitle}
                      </TableCell>
                      <TableCell className="font-medium">
                        {shift.roleName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatWeekdayDateTimeRange(
                          shift.startsAt,
                          shift.endsAt,
                        )}
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
    </PageContainer>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShiftType } from "@prisma/client";
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
import { SHIFT_TYPE_LABELS } from "@/components/feature/admin-events/shift-dialog";
import {
  bookShift,
  cancelBooking,
  updateBookingCertainty,
} from "@/components/feature/helfer/actions";
import {
  markAttending,
  markNotAttending,
} from "@/components/feature/helfer/attendance-actions";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

export type HelferShiftRow = {
  id: string;
  type: ShiftType;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  isFull: boolean;
  ownBooking: { uncertain: boolean } | null;
};

export type HelferEventOption = {
  id: string;
  title: string;
};

export function HelferView({
  events,
  selectedEventId,
  shifts,
  isExplainer,
  isAttendingAsExplainer,
}: {
  events: HelferEventOption[];
  selectedEventId: string | null;
  shifts: HelferShiftRow[];
  isExplainer: boolean;
  isAttendingAsExplainer: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function selectEvent(eventId: string) {
    router.push(`/helfer?event=${eventId}`);
  }

  function withErrorHandling(action: () => Promise<{ error?: string; success?: true }>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Helferplan"
        description="Trag dich in offene Schichten ein — sicher oder vorläufig."
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
              withErrorHandling(() =>
                isAttendingAsExplainer
                  ? markNotAttending(selectedEventId)
                  : markAttending(selectedEventId),
              )
            }
          >
            {isAttendingAsExplainer ? "Abmelden" : "Ich bin heute als Erklärbär da"}
          </Button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aktuell ist kein Event geplant.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Typ</TableHead>
                <TableHead>Zeit</TableHead>
                <TableHead>Besetzt</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow
                  key={shift.id}
                  className={shift.ownBooking ? "bg-primary/5" : undefined}
                >
                  <TableCell className="font-medium">
                    {SHIFT_TYPE_LABELS[shift.type]}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {dateTime.format(new Date(shift.startsAt))} –{" "}
                    {dateTime.format(new Date(shift.endsAt))}
                  </TableCell>
                  <TableCell>
                    {shift.ownBooking ? (
                      <StatusPill
                        label={`${shift.booked}/${shift.capacity} · ${
                          shift.ownBooking.uncertain ? "du (vorläufig)" : "du (sicher)"
                        }`}
                        tone={shift.ownBooking.uncertain ? "warning" : "positive"}
                      />
                    ) : (
                      <span className="text-sm">
                        {shift.booked}/{shift.capacity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {shift.ownBooking ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            withErrorHandling(() =>
                              updateBookingCertainty(
                                shift.id,
                                !shift.ownBooking!.uncertain,
                              ),
                            )
                          }
                        >
                          {shift.ownBooking.uncertain ? "Als sicher markieren" : "Als vorläufig markieren"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            withErrorHandling(() => cancelBooking(shift.id))
                          }
                        >
                          Abmelden
                        </Button>
                      </div>
                    ) : shift.isFull ? (
                      <span className="text-muted-foreground">voll</span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          withErrorHandling(() => bookShift(shift.id, false))
                        }
                      >
                        Zusagen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

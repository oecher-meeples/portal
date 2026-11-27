"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Send, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HelperPhase } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ShiftDialog,
  type EditableShift,
  type EventDayOption,
  type HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import { ShiftMatrixDialog } from "@/components/feature/admin-events/shift-matrix-dialog";
import { ShiftTableEditor } from "@/components/feature/admin-events/shift-table-editor";
import { deleteShift } from "@/components/feature/admin-events/shift-actions";
import { setEventHelperPhase } from "@/components/feature/admin-events/actions";
import { computeShiftFillStatus } from "@/lib/events/shift-capacity";
import { formatTimeRange, formatWeekdayDate } from "@/lib/utils/format";

export type ShiftRow = EditableShift & {
  dayDate: string;
  bookings: { confirmedAt: Date | null; startsAt: Date; endsAt: Date }[];
};

type FillLevelFilter = "alle" | "unvollstaendig";

function fillStatusOf(shift: ShiftRow) {
  return computeShiftFillStatus(
    {
      capacity: shift.capacity,
      targetStartsAt: new Date(shift.targetStartsAt),
      targetEndsAt: new Date(shift.targetEndsAt),
    },
    shift.bookings,
  );
}

/**
 * Schichten-Tabelle des Events (#150 ff.) — oberhalb Tag- und Schichten-
 * Filter, plus ein Umschalter in die zeilenweise Schnellbearbeitung
 * (`ShiftTableEditor`). Der bestehende Schicht-anlegen/-bearbeiten-Dialog
 * bleibt unverändert die Grundlage der Einzelbearbeitung.
 */
export function ShiftTableSection({
  eventId,
  helperPhase,
  days,
  shifts,
  helperRoles,
}: {
  eventId: string;
  helperPhase: HelperPhase;
  days: EventDayOption[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
}) {
  const [filterDayId, setFilterDayId] = useState("alle");
  const [filterRoleId, setFilterRoleId] = useState("alle");
  const [filterFillLevel, setFilterFillLevel] =
    useState<FillLevelFilter>("alle");
  const [editing, setEditing] = useState(false);

  const filteredShifts = shifts.filter((shift) => {
    if (filterDayId !== "alle" && shift.dayId !== filterDayId) return false;
    if (filterRoleId !== "alle" && shift.roleId !== filterRoleId) return false;
    if (filterFillLevel === "unvollstaendig") {
      if (fillStatusOf(shift).isFull) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      {!editing && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tag" htmlFor="shift-filter-day">
              <NativeSelect
                id="shift-filter-day"
                size="md"
                value={filterDayId}
                onChange={(event) => setFilterDayId(event.target.value)}
              >
                <option value="alle">Alle</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {formatWeekdayDate(day.date)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Rolle" htmlFor="shift-filter-role">
              <NativeSelect
                id="shift-filter-role"
                size="md"
                value={filterRoleId}
                onChange={(event) => setFilterRoleId(event.target.value)}
              >
                <option value="alle">Alle</option>
                {helperRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Füllstand" htmlFor="shift-filter-fill-level">
              <NativeSelect
                id="shift-filter-fill-level"
                size="md"
                value={filterFillLevel}
                onChange={(event) =>
                  setFilterFillLevel(event.target.value as FillLevelFilter)
                }
              >
                <option value="alle">Alle</option>
                <option value="unvollstaendig">Unvollständige</option>
              </NativeSelect>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RequestShiftsToggle eventId={eventId} helperPhase={helperPhase} />
            <ShiftMatrixDialog
              key={shifts.map((shift) => shift.id).join(",")}
              eventId={eventId}
              days={days}
              shifts={shifts}
              helperRoles={helperRoles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setEditing(true)}
              disabled={shifts.length === 0}
            >
              <Pencil className="size-4" />
              Schichten bearbeiten
            </Button>
          </div>
        </div>
      )}

      {editing ? (
        <ShiftTableEditor
          eventId={eventId}
          days={days}
          shifts={shifts}
          helperRoles={helperRoles}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
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
              {filteredShifts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground text-center"
                  >
                    {shifts.length === 0
                      ? "Noch keine Schichten angelegt."
                      : "Keine Schichten für diese Filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredShifts.map((shift) => {
                  const fillLevel = fillStatusOf(shift);
                  return (
                    <TableRow key={shift.id}>
                      <TableCell className="text-muted-foreground">
                        {formatWeekdayDate(shift.dayDate)}
                      </TableCell>
                      <TableCell>{shift.roleName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimeRange(
                          shift.targetStartsAt,
                          shift.targetEndsAt,
                        )}
                      </TableCell>
                      <TableCell>
                        {shift.capacity === 0 ? (
                          <span className="text-muted-foreground">
                            unbegrenzt
                          </span>
                        ) : fillLevel.isFull ? (
                          <StatusPill label="voll" tone="warning" />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {fillLevel.booked} / {fillLevel.capacity}
                            {fillLevel.hasGap && (
                              <span title="Lücke">
                                <AlertTriangle
                                  className="size-4 text-amber-600"
                                  aria-label="Lücke"
                                />
                              </span>
                            )}
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
                          confirm="Schicht wirklich löschen? Vorhandene Zuweisungen werden mit entfernt."
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
      )}
    </div>
  );
}

/** Schalter "Schichten anfragen" (#676): "Bestätigung angefragt" ein/aus.
 * Aus fällt auf "Helfer gesucht" zurück — Zuweisungen werden für Meeples
 * ausgeblendet, Bestätigungen bleiben erhalten. */
function RequestShiftsToggle({
  eventId,
  helperPhase,
}: {
  eventId: string;
  helperPhase: HelperPhase;
}) {
  const requested = helperPhase === "CONFIRMATION_REQUESTED";

  return (
    <ActionDialog
      refresh
      trigger={
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Send className="size-4" />
          Schichten anfragen
          <StatusPill
            label={requested ? "Angefragt" : "Planung"}
            tone={requested ? "positive" : "warning"}
          />
        </Button>
      }
      title={requested ? "Schichtanfrage zurücknehmen?" : "Schichten anfragen?"}
      description={
        requested
          ? "Zuweisungen werden für die Meeples wieder ausgeblendet. Bestätigungen bleiben erhalten."
          : "Alle Zuweisungen werden für die Meeples sichtbar und müssen bestätigt werden. (Ich bin fertig mit Planung, jetzt Schichten anfragen.)"
      }
      submitLabel={requested ? "Zurücknehmen" : "Jetzt anfragen"}
      action={() =>
        setEventHelperPhase(
          eventId,
          requested ? "SEEKING" : "CONFIRMATION_REQUESTED",
        )
      }
    />
  );
}

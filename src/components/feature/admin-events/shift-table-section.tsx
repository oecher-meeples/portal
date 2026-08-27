"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Field } from "@/components/ui/field";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import {
  ShiftDialog,
  type EditableShift,
  type EventDayOption,
  type HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import { ShiftTableEditor } from "@/components/feature/admin-events/shift-table-editor";
import { deleteShift } from "@/components/feature/admin-events/shift-actions";
import { computeShiftFillLevel } from "@/lib/events/shift-capacity";
import {
  formatDateMedium,
  formatDateTimeRange,
  formatTimePlain,
} from "@/lib/utils/format";

export type ShiftRow = EditableShift & {
  dayDate: string;
  bookings: { confirmedAt: Date | null }[];
};

const SELECT_CLASSNAME =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";

/** Kurzbezeichnung einer Schicht für den Mehrfachauswahl-Filter — eindeutig
 * genug, um mehrere Schichten derselben Rolle am selben Tag zu unterscheiden. */
function shiftLabel(shift: ShiftRow): string {
  return `${formatDateMedium(shift.dayDate)} · ${shift.roleName} (${formatTimePlain(shift.targetStartsAt)}–${formatTimePlain(shift.targetEndsAt)})`;
}

/**
 * Schichten-Tabelle des Events (#150 ff.) — oberhalb Tag- und Schichten-
 * Filter, plus ein Umschalter in die zeilenweise Schnellbearbeitung
 * (`ShiftTableEditor`). Der bestehende Schicht-anlegen/-bearbeiten-Dialog
 * bleibt unverändert die Grundlage der Einzelbearbeitung.
 */
export function ShiftTableSection({
  eventId,
  days,
  shifts,
  helperRoles,
}: {
  eventId: string;
  days: EventDayOption[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
}) {
  const [filterDayId, setFilterDayId] = useState("alle");
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const filteredShifts = shifts.filter(
    (shift) =>
      (filterDayId === "alle" || shift.dayId === filterDayId) &&
      (filterLabels.length === 0 || filterLabels.includes(shiftLabel(shift))),
  );

  return (
    <div className="flex flex-col gap-3">
      {!editing && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tag" htmlFor="shift-filter-day">
              <select
                id="shift-filter-day"
                className={SELECT_CLASSNAME}
                value={filterDayId}
                onChange={(event) => setFilterDayId(event.target.value)}
              >
                <option value="alle">Alle</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {formatDateMedium(day.date)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Schichten"
              htmlFor="shift-filter-labels"
              className="min-w-64"
            >
              <MultiSelectCombobox
                id="shift-filter-labels"
                options={shifts.map(shiftLabel)}
                value={filterLabels}
                onValueChange={setFilterLabels}
                placeholder="Schicht suchen …"
                emptyLabel="Keine passende Schicht"
              />
            </Field>
          </div>
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
                  const fillLevel = computeShiftFillLevel(
                    shift,
                    shift.bookings,
                  );
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
      )}
    </div>
  );
}

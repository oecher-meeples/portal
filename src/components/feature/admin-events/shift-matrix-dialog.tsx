"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyShiftMatrix } from "@/components/feature/admin-events/shift-actions";
import type {
  EventDayOption,
  HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import type { ShiftRow } from "@/components/feature/admin-events/shift-table-section";
import {
  diffShiftMatrix,
  initialMatrixCells,
  matrixCellKey,
} from "@/lib/events/shift-matrix";
import { formatWeekdayDate } from "@/lib/utils/format";

/** „Schicht anlegen“ (#693): Tag×Rolle-Matrix statt Einzelformular. Neue
 * Häkchen legen Schichten mit den Öffnungszeiten des Tages an (Stellenzahl 1),
 * entfernte Häkchen löschen die Schicht samt Zuweisungen. */
export function ShiftMatrixDialog({
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
  const [checked, setChecked] = useState(() => initialMatrixCells(shifts));
  const diff = diffShiftMatrix(days, shifts, checked);
  const changed = diff.add.length + diff.removeShiftIds.length > 0;

  function toggle(key: string, value: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <ActionDialog
      refresh
      trigger={
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Schicht anlegen
        </Button>
      }
      title="Schichten anlegen"
      description="Hake an, welche Rolle an welchem Tag gebraucht wird. Zeiten kommen aus den Öffnungszeiten des Tages (sonst 09:00–18:00), die Stellenzahl startet bei 1 — beides lässt sich danach anpassen."
      contentClassName="sm:max-w-2xl"
      submitLabel="Speichern"
      canSubmit={changed}
      action={() => applyShiftMatrix(eventId, diff)}
      onReset={() => setChecked(initialMatrixCells(shifts))}
    >
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tag</TableHead>
              {helperRoles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.id}>
                <TableCell className="text-muted-foreground">
                  {formatWeekdayDate(day.date)}
                </TableCell>
                {helperRoles.map((role) => {
                  const key = matrixCellKey(day.id, role.id);
                  return (
                    <TableCell key={role.id} className="text-center">
                      <input
                        type="checkbox"
                        aria-label={`${role.name} am ${formatWeekdayDate(day.date)}`}
                        checked={checked.has(key)}
                        onChange={(event) => toggle(key, event.target.checked)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {diff.removeShiftIds.length > 0 && (
        <p className="text-destructive text-sm" role="alert">
          {diff.removeShiftIds.length} Schicht(en) werden gelöscht
          {diff.removedBookings > 0
            ? `, inklusive ${diff.removedBookings} Zuweisung(en)`
            : ""}
          .
        </p>
      )}
    </ActionDialog>
  );
}

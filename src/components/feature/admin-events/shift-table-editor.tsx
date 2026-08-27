"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createShift,
  updateShift,
  deleteShift,
} from "@/components/feature/admin-events/shift-actions";
import type {
  EventDayOption,
  HelperRoleOption,
} from "@/components/feature/admin-events/shift-dialog";
import type { ShiftRow } from "@/components/feature/admin-events/shift-table-section";
import { formatWeekdayDate } from "@/lib/utils/format";
import {
  MINUTES_PER_DAY,
  combineDateAndMinutes,
  formatMinutesAsTime,
  minutesSinceMidnight,
} from "@/lib/utils/time-of-day";

type EditRow = {
  key: string;
  id: string | null;
  dayId: string;
  roleId: string;
  startMinutes: number;
  endMinutes: number;
  capacity: string;
};

const SELECT_CLASSNAME =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";

/** Fallback für einen Tag ohne hinterlegte Öffnungszeiten — dieselben
 * Default-Zeiten wie beim Helferplan-Verfügbarkeitsformular. */
const DEFAULT_RANGE: [number, number] = [9 * 60, 18 * 60];

function defaultRangeForDay(day: EventDayOption | undefined): [number, number] {
  if (day?.startsAt && day.endsAt) {
    return [
      minutesSinceMidnight(day.startsAt),
      minutesSinceMidnight(day.endsAt),
    ];
  }
  return DEFAULT_RANGE;
}

function rowFromShift(shift: ShiftRow): EditRow {
  return {
    key: shift.id,
    id: shift.id,
    dayId: shift.dayId,
    roleId: shift.roleId,
    startMinutes: minutesSinceMidnight(shift.targetStartsAt),
    endMinutes: minutesSinceMidnight(shift.targetEndsAt),
    capacity: String(shift.capacity),
  };
}

/** Zeilenweise Bearbeitung aller Schichten eines Events auf einmal
 * (Schnellbearbeitung, statt einzeln über den Schicht-Dialog) — pro Zeile
 * Tag/Rolle/Ziel-Zeitraum (00:00–24:00-Regler)/Stellenzahl, plus eine
 * "weitere Schicht hinzufügen"-Zeile. Ein Tagwechsel füllt den Regler mit
 * den Öffnungszeiten des neu gewählten Tages, auch beim Anlegen einer neuen
 * Zeile. Speichern diffed gegen die ursprüngliche Liste und ruft dieselben
 * Actions wie der Schicht-Dialog auf (create/update/delete). */
export function ShiftTableEditor({
  eventId,
  days,
  shifts,
  helperRoles,
  onCancel,
  onSaved,
}: {
  eventId: string;
  days: EventDayOption[];
  shifts: ShiftRow[];
  helperRoles: HelperRoleOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditRow[]>(() => shifts.map(rowFromShift));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(0);

  function updateRow(key: string, patch: Partial<EditRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleDayChange(key: string, dayId: string) {
    const [startMinutes, endMinutes] = defaultRangeForDay(
      days.find((day) => day.id === dayId),
    );
    updateRow(key, { dayId, startMinutes, endMinutes });
  }

  function addRow() {
    const day = days[0];
    const [startMinutes, endMinutes] = defaultRangeForDay(day);
    setRows((current) => [
      ...current,
      {
        key: `new-${nextKey.current++}`,
        id: null,
        dayId: day?.id ?? "",
        roleId: helperRoles[0]?.id ?? "",
        startMinutes,
        endMinutes,
        capacity: "1",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  async function handleSave() {
    setPending(true);
    setError(null);

    const keptIds = new Set(
      rows.map((row) => row.id).filter((id): id is string => id !== null),
    );
    for (const shift of shifts) {
      if (keptIds.has(shift.id)) continue;
      await deleteShift(shift.id);
    }

    for (const row of rows) {
      const day = days.find((d) => d.id === row.dayId);
      if (!day) continue;
      const input = {
        dayId: row.dayId,
        roleId: row.roleId,
        targetStartsAt: combineDateAndMinutes(day.date, row.startMinutes),
        targetEndsAt: combineDateAndMinutes(day.date, row.endMinutes),
        capacity: Number(row.capacity),
      };
      const result = row.id
        ? await updateShift(row.id, input)
        : await createShift(eventId, input);
      if ("error" in result) {
        setError(result.error ?? "Unbekannter Fehler.");
        setPending(false);
        return;
      }
    }

    setPending(false);
    router.refresh();
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tag</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Ziel-Zeitraum</TableHead>
              <TableHead>Stellen</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <select
                    aria-label="Tag"
                    className={SELECT_CLASSNAME}
                    value={row.dayId}
                    onChange={(event) =>
                      handleDayChange(row.key, event.target.value)
                    }
                  >
                    {days.map((day) => (
                      <option key={day.id} value={day.id}>
                        {formatWeekdayDate(day.date)}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    aria-label="Rolle"
                    className={SELECT_CLASSNAME}
                    value={row.roleId}
                    onChange={(event) =>
                      updateRow(row.key, { roleId: event.target.value })
                    }
                  >
                    {helperRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="min-w-48">
                  <RangeSlider
                    min={0}
                    max={MINUTES_PER_DAY}
                    step={15}
                    value={[row.startMinutes, row.endMinutes]}
                    onValueChange={([startMinutes, endMinutes]) =>
                      updateRow(row.key, { startMinutes, endMinutes })
                    }
                    getAriaLabel={(index) =>
                      index === 0 ? "Ziel-Beginn" : "Ziel-Ende"
                    }
                  />
                  <span className="text-muted-foreground text-xs">
                    {formatMinutesAsTime(row.startMinutes)} –{" "}
                    {formatMinutesAsTime(row.endMinutes)}
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    aria-label="Stellenzahl"
                    type="number"
                    min={1}
                    className="w-16"
                    value={row.capacity}
                    onChange={(event) =>
                      updateRow(row.key, { capacity: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zeile entfernen"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={5}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addRow}
                >
                  <Plus className="size-4" />
                  Weitere Schicht hinzufügen
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          Abbrechen
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
          {pending ? "Speichere…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}

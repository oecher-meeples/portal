"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";
import { NativeSelect } from "@/components/ui/native-select";
import { useAction, type ActionResult } from "@/components/ui/use-action";
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
import { defaultRangeForDay } from "@/lib/events/shift-defaults";
import { groupRowsByDay } from "@/lib/events/shift-matrix";
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

/** Bearbeitung aller Schichten eines Events auf einmal, nach Tagen gruppiert
 * (#693): alle Tage sichtbar, je Tag ein „+ Schicht“-Button (Regler startet
 * mit den Öffnungszeiten des Tages), je Zeile Rolle/Ziel-Zeitraum
 * (00:00–24:00-Regler)/Stellenzahl. Der Tag einer Schicht ist nicht änderbar. Speichern diffed gegen die ursprüngliche Liste und ruft dieselben
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
  const [rows, setRows] = useState<EditRow[]>(() => shifts.map(rowFromShift));
  const { run, pending, error } = useAction({ onSuccess: onSaved });
  const nextKey = useRef(0);

  function updateRow(key: string, patch: Partial<EditRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow(dayId: string) {
    const [startMinutes, endMinutes] = defaultRangeForDay(
      days.find((day) => day.id === dayId),
    );
    setRows((current) => [
      ...current,
      {
        key: `new-${nextKey.current++}`,
        id: null,
        dayId,
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
    await run(saveRows);
  }

  /** Löschen, dann anlegen/ändern — bricht beim ersten Fehler ab und gibt ihn
   * zurück, statt ihn (wie früher beim Löschen) zu verschlucken. */
  async function saveRows() {
    const keptIds = new Set(
      rows.map((row) => row.id).filter((id): id is string => id !== null),
    );
    for (const shift of shifts) {
      if (keptIds.has(shift.id)) continue;
      const deleted: ActionResult = await deleteShift(shift.id);
      if (deleted?.error) return deleted;
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
      if ("error" in result) return result;
    }

    return { success: true as const };
  }

  return (
    <div className="flex flex-col gap-3">
      {groupRowsByDay(days, rows).map(({ day, rows: dayRows }) => (
        <section
          key={day.id}
          aria-label={formatWeekdayDate(day.date)}
          className="flex flex-col gap-2 rounded-lg border p-3"
        >
          <h3 className="text-sm font-semibold">
            {formatWeekdayDate(day.date)}
          </h3>
          {dayRows.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Noch keine Schicht angelegt.
            </p>
          )}
          {dayRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[10rem_1fr_5rem_auto] items-center gap-3"
            >
              <NativeSelect
                aria-label="Rolle"
                size="md"
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
              </NativeSelect>
              <div className="min-w-48">
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
              </div>
              <Input
                aria-label="Stellenzahl"
                type="number"
                min={0}
                value={row.capacity}
                onChange={(event) =>
                  updateRow(row.key, { capacity: event.target.value })
                }
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label="Zeile entfernen"
                onClick={() => removeRow(row.key)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => addRow(day.id)}
            >
              <Plus className="size-4" />
              Schicht
            </Button>
          </div>
        </section>
      ))}

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

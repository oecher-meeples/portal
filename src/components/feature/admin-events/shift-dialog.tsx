"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/field";
import { TimePicker, timeInputValue } from "@/components/ui/time-picker";
import {
  createShift,
  updateShift,
} from "@/components/feature/admin-events/shift-actions";
import { formatDateMedium, formatTimePlain } from "@/lib/utils/format";

export type EditableShift = {
  id: string;
  dayId: string;
  roleId: string;
  roleName: string;
  targetStartsAt: string;
  targetEndsAt: string;
  capacity: number;
};

export type HelperRoleOption = { id: string; name: string };
export type EventDayOption = {
  id: string;
  date: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

/** Kombiniert das Kalenderdatum des gewählten Tags mit einer "HH:mm"-Uhrzeit
 * zum Date, das die Action erwartet — Ziel-Beginn/-Ende sind reine
 * Uhrzeiten, das Datum kommt aus der Tag-Auswahl, nicht aus einem eigenen
 * datetime-local-Feld. */
function toDateTime(dateIso: string, time: string): Date {
  return new Date(`${dateIso.slice(0, 10)}T${time}:00`);
}

export function ShiftDialog({
  eventId,
  shift,
  helperRoles,
  days,
  defaultDayId,
  defaultStartTime,
  defaultEndTime,
  open,
  onOpenChange,
}: {
  eventId: string;
  shift?: EditableShift;
  helperRoles: HelperRoleOption[];
  days: EventDayOption[];
  /** Tag, mit dem sich anlegen befüllt — z. B. der Tab, aus dem heraus der
   * Dialog im Schichtplan-Editor geöffnet wurde. Ohne Wirkung beim Bearbeiten
   * einer bestehenden Schicht (die behält ihren eigenen Tag). */
  defaultDayId?: string;
  /** Vorausgefüllte Ziel-Zeiten aus einer Zellen-Auswahl im Schichtplan-Grid
   * (Schnellanlage) — nur beim Anlegen wirksam, HH:mm. */
  defaultStartTime?: string;
  defaultEndTime?: string;
  /** Gesteuerter Open-State statt eigenem Trigger — für die programmatische
   * Öffnung nach einer Zellen-Auswahl. Ohne diese Props zeigt der Dialog wie
   * gewohnt seinen eigenen Trigger-Button (Anlegen/Bearbeiten). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(shift);
  const isControlled = open !== undefined;
  const initialDayId = () => shift?.dayId ?? defaultDayId ?? days[0]?.id ?? "";
  const [dayId, setDayId] = useState(initialDayId);
  const [roleId, setRoleId] = useState(
    shift?.roleId ?? helperRoles[0]?.id ?? "",
  );
  const [targetStartsAt, setTargetStartsAt] = useState(
    shift ? timeInputValue(shift.targetStartsAt) : (defaultStartTime ?? ""),
  );
  const [targetEndsAt, setTargetEndsAt] = useState(
    shift ? timeInputValue(shift.targetEndsAt) : (defaultEndTime ?? ""),
  );
  const [capacity, setCapacity] = useState(String(shift?.capacity ?? 1));
  const selectedDay = days.find((day) => day.id === dayId);

  function reset() {
    setDayId(initialDayId());
    setRoleId(shift?.roleId ?? helperRoles[0]?.id ?? "");
    setTargetStartsAt(
      shift ? timeInputValue(shift.targetStartsAt) : (defaultStartTime ?? ""),
    );
    setTargetEndsAt(
      shift ? timeInputValue(shift.targetEndsAt) : (defaultEndTime ?? ""),
    );
    setCapacity(String(shift?.capacity ?? 1));
  }

  return (
    <ActionDialog
      trigger={
        isControlled ? undefined : isEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="size-4" />
            Bearbeiten
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Schicht anlegen
          </Button>
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Schicht bearbeiten" : "Neue Schicht"}
      description="Bedarf an einer Helferrolle für einen Event-Tag — Stellenzahl plus eigener Ziel-Zeitraum, unabhängig vom Event-Zeitraum."
      submitLabel={isEdit ? "Speichern" : "Schicht anlegen"}
      canSubmit={
        Boolean(dayId) &&
        Boolean(roleId) &&
        Boolean(targetStartsAt) &&
        Boolean(targetEndsAt)
      }
      action={() => {
        const dayDate = days.find((day) => day.id === dayId)?.date ?? "";
        const input = {
          dayId,
          roleId,
          targetStartsAt: toDateTime(dayDate, targetStartsAt),
          targetEndsAt: toDateTime(dayDate, targetEndsAt),
          capacity: Number(capacity),
        };
        return shift
          ? updateShift(shift.id, input)
          : createShift(eventId, input);
      }}
      onReset={reset}
    >
      <Field label="Tag" htmlFor="shift-day">
        <select
          id="shift-day"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          value={dayId}
          onChange={(event) => setDayId(event.target.value)}
        >
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {formatDateMedium(day.date)}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-muted-foreground -mt-2 text-xs">
        {selectedDay?.startsAt && selectedDay.endsAt
          ? `Öffnungszeiten: ${formatTimePlain(selectedDay.startsAt)} – ${formatTimePlain(selectedDay.endsAt)}`
          : "Für diesen Tag sind noch keine Öffnungszeiten hinterlegt."}
      </p>
      <Field label="Rolle" htmlFor="shift-role">
        <select
          id="shift-role"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
        >
          {helperRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>
      <TimePicker
        id="shift-target-starts"
        label="Ziel-Beginn"
        value={targetStartsAt}
        onChange={setTargetStartsAt}
        required
      />
      <TimePicker
        id="shift-target-ends"
        label="Ziel-Ende"
        value={targetEndsAt}
        onChange={setTargetEndsAt}
        required
      />
      <TextField
        id="shift-capacity"
        label="Stellenzahl"
        type="number"
        min={1}
        value={capacity}
        onChange={(event) => setCapacity(event.target.value)}
        required
      />
    </ActionDialog>
  );
}

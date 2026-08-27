"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/field";
import {
  createShift,
  updateShift,
} from "@/components/feature/admin-events/shift-actions";
import { formatDateMedium } from "@/lib/utils/format";

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
export type EventDayOption = { id: string; date: string };

function toDateTimeLocal(iso: string) {
  return iso.slice(0, 16);
}

export function ShiftDialog({
  eventId,
  shift,
  helperRoles,
  days,
  defaultDayId,
}: {
  eventId: string;
  shift?: EditableShift;
  helperRoles: HelperRoleOption[];
  days: EventDayOption[];
  /** Tag, mit dem sich anlegen befüllt — z. B. der Tab, aus dem heraus der
   * Dialog im Schichtplan-Editor geöffnet wurde. Ohne Wirkung beim Bearbeiten
   * einer bestehenden Schicht (die behält ihren eigenen Tag). */
  defaultDayId?: string;
}) {
  const isEdit = Boolean(shift);
  const initialDayId = () => shift?.dayId ?? defaultDayId ?? days[0]?.id ?? "";
  const [dayId, setDayId] = useState(initialDayId);
  const [roleId, setRoleId] = useState(
    shift?.roleId ?? helperRoles[0]?.id ?? "",
  );
  const [targetStartsAt, setTargetStartsAt] = useState(
    shift ? toDateTimeLocal(shift.targetStartsAt) : "",
  );
  const [targetEndsAt, setTargetEndsAt] = useState(
    shift ? toDateTimeLocal(shift.targetEndsAt) : "",
  );
  const [capacity, setCapacity] = useState(String(shift?.capacity ?? 1));

  function reset() {
    setDayId(initialDayId());
    setRoleId(shift?.roleId ?? helperRoles[0]?.id ?? "");
    setTargetStartsAt(shift ? toDateTimeLocal(shift.targetStartsAt) : "");
    setTargetEndsAt(shift ? toDateTimeLocal(shift.targetEndsAt) : "");
    setCapacity(String(shift?.capacity ?? 1));
  }

  return (
    <ActionDialog
      trigger={
        isEdit ? (
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
        const input = {
          dayId,
          roleId,
          targetStartsAt: new Date(targetStartsAt),
          targetEndsAt: new Date(targetEndsAt),
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
      <TextField
        id="shift-target-starts"
        label="Ziel-Beginn"
        type="datetime-local"
        value={targetStartsAt}
        onChange={(event) => setTargetStartsAt(event.target.value)}
        required
      />
      <TextField
        id="shift-target-ends"
        label="Ziel-Ende"
        type="datetime-local"
        value={targetEndsAt}
        onChange={(event) => setTargetEndsAt(event.target.value)}
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

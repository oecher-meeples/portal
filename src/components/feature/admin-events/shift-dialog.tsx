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

export type EditableShift = {
  id: string;
  roleId: string;
  roleName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

export type HelperRoleOption = { id: string; name: string };

function toDateTimeLocal(iso: string) {
  return iso.slice(0, 16);
}

export function ShiftDialog({
  eventId,
  shift,
  helperRoles,
}: {
  eventId: string;
  shift?: EditableShift;
  helperRoles: HelperRoleOption[];
}) {
  const isEdit = Boolean(shift);
  const [roleId, setRoleId] = useState(
    shift?.roleId ?? helperRoles[0]?.id ?? "",
  );
  const [startsAt, setStartsAt] = useState(
    shift ? toDateTimeLocal(shift.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    shift ? toDateTimeLocal(shift.endsAt) : "",
  );
  const [capacity, setCapacity] = useState(String(shift?.capacity ?? 1));

  function reset() {
    setRoleId(shift?.roleId ?? helperRoles[0]?.id ?? "");
    setStartsAt(shift ? toDateTimeLocal(shift.startsAt) : "");
    setEndsAt(shift ? toDateTimeLocal(shift.endsAt) : "");
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
          <Button className="gap-1.5">
            <Plus className="size-4" />
            Schicht anlegen
          </Button>
        )
      }
      title={isEdit ? "Schicht bearbeiten" : "Neue Schicht"}
      description="Helferrolle mit festem Zeitfenster und Kapazität."
      submitLabel={isEdit ? "Speichern" : "Schicht anlegen"}
      canSubmit={Boolean(roleId) && Boolean(startsAt) && Boolean(endsAt)}
      action={() => {
        const input = {
          roleId,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          capacity: Number(capacity),
        };
        return shift
          ? updateShift(shift.id, input)
          : createShift(eventId, input);
      }}
      onReset={reset}
    >
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
        id="shift-starts"
        label="Beginn"
        type="datetime-local"
        value={startsAt}
        onChange={(event) => setStartsAt(event.target.value)}
        required
      />
      <TextField
        id="shift-ends"
        label="Ende"
        type="datetime-local"
        value={endsAt}
        onChange={(event) => setEndsAt(event.target.value)}
        required
      />
      <TextField
        id="shift-capacity"
        label="Kapazität"
        type="number"
        min={1}
        value={capacity}
        onChange={(event) => setCapacity(event.target.value)}
        required
      />
    </ActionDialog>
  );
}

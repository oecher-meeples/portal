"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import {
  setOwnHelperAvailability,
  clearOwnHelperAvailability,
} from "@/components/feature/helfer/availability-actions";
import { formatDateMedium } from "@/lib/utils/format";

export type HelperRoleOption = { id: string; name: string };

export type EventDayOption = { id: string; date: string };

export type OwnAvailability = {
  startsAt: string;
  endsAt: string;
  roleIds: string[];
};

function toTimeInput(iso: string) {
  return new Date(iso).toTimeString().slice(0, 5);
}

function toDateTime(dateIso: string, time: string): Date {
  return new Date(`${dateIso.slice(0, 10)}T${time}:00`);
}

/** Pro Event-Tag: Verfügbarkeitsfenster + Rollen-Mehrfachauswahl (#156) —
 * getrennt von der admin-seitigen Zeitblock-Zuweisung (Schichtplan-Editor). */
export function HelperAvailabilityForm({
  day,
  helperRoles,
  own,
}: {
  day: EventDayOption;
  helperRoles: HelperRoleOption[];
  own: OwnAvailability | null;
}) {
  const [startsAt, setStartsAt] = useState(
    own ? toTimeInput(own.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(own ? toTimeInput(own.endsAt) : "");
  const [roleIds, setRoleIds] = useState<string[]>(own?.roleIds ?? []);
  const { run, pending, error } = useAction();

  function toggleRole(roleId: string, checked: boolean) {
    setRoleIds((current) =>
      checked ? [...current, roleId] : current.filter((id) => id !== roleId),
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          setOwnHelperAvailability(
            day.id,
            toDateTime(day.date, startsAt),
            toDateTime(day.date, endsAt),
            roleIds,
          ),
        );
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <span className="w-32 text-sm font-medium">
          {formatDateMedium(day.date)}
        </span>
        <TextField
          id={`availability-${day.id}-starts`}
          label="Von"
          type="time"
          value={startsAt}
          onChange={(fieldEvent) => setStartsAt(fieldEvent.target.value)}
          fieldClassName="w-28"
          required
        />
        <TextField
          id={`availability-${day.id}-ends`}
          label="Bis"
          type="time"
          value={endsAt}
          onChange={(fieldEvent) => setEndsAt(fieldEvent.target.value)}
          fieldClassName="w-28"
          required
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {helperRoles.map((role) => (
          <label
            key={role.id}
            className="flex items-center gap-1.5 text-sm font-normal"
          >
            <input
              type="checkbox"
              checked={roleIds.includes(role.id)}
              onChange={(event) => toggleRole(role.id, event.target.checked)}
            />
            {role.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="size-4" />
          {own ? "Aktualisieren" : "Verfügbarkeit melden"}
        </Button>
        {own && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => clearOwnHelperAvailability(day.id))}
          >
            <X className="size-4" />
            Zurückziehen
          </Button>
        )}
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </form>
  );
}

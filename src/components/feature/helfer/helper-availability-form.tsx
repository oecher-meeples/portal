"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
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

const MINUTES_PER_DAY = 24 * 60;

function toDateTime(dateIso: string, minutesFromMidnight: number): Date {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  date.setMinutes(minutesFromMidnight);
  return date;
}

function minutesSinceMidnight(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

/** Pro Event-Tag: Verfügbarkeitsfenster (00:00–24:00-Regler) + Rollen-
 * Mehrfachauswahl (#156), beschränkt auf die Rollen, für die an diesem Tag
 * tatsächlich Schichten existieren — getrennt von der admin-seitigen
 * Zeitblock-Zuweisung (Schichtplan-Editor). Der Speichern-Button steht als
 * letzte Spalte im Grid. */
export function HelperAvailabilityForm({
  day,
  dayRoles,
  own,
}: {
  day: EventDayOption;
  dayRoles: HelperRoleOption[];
  own: OwnAvailability | null;
}) {
  const [range, setRange] = useState<[number, number]>(
    own
      ? [minutesSinceMidnight(own.startsAt), minutesSinceMidnight(own.endsAt)]
      : [9 * 60, 18 * 60],
  );
  const [roleIds, setRoleIds] = useState<string[]>(own?.roleIds ?? []);
  const { run, pending, error } = useAction();

  function toggleRole(roleId: string, checked: boolean) {
    setRoleIds((current) =>
      checked ? [...current, roleId] : current.filter((id) => id !== roleId),
    );
  }

  function save() {
    run(() =>
      setOwnHelperAvailability(
        day.id,
        toDateTime(day.date, range[0]),
        toDateTime(day.date, range[1]),
        roleIds,
      ),
    );
  }

  return (
    <div className="grid grid-cols-[8rem_1fr_1fr_auto] items-center gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm font-medium">{formatDateMedium(day.date)}</span>
      <div className="flex flex-col gap-1">
        <RangeSlider
          min={0}
          max={MINUTES_PER_DAY}
          step={15}
          value={range}
          onValueChange={setRange}
          getAriaLabel={(index) => (index === 0 ? "Von" : "Bis")}
        />
        <span className="text-muted-foreground text-xs">
          {formatMinutes(range[0])} – {formatMinutes(range[1])}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {dayRoles.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            Keine Schichten an diesem Tag geplant.
          </span>
        ) : (
          dayRoles.map((role) => (
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
          ))
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={save}>
          <Save className="size-4" />
          Speichern
        </Button>
        {own && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Verfügbarkeit zurückziehen"
            disabled={pending}
            onClick={() => run(() => clearOwnHelperAvailability(day.id))}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {error && (
        <span className="text-destructive col-span-4 text-xs">{error}</span>
      )}
    </div>
  );
}

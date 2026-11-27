"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
import { useAction } from "@/components/ui/use-action";
import {
  setOwnHelperAvailability,
  clearOwnHelperAvailability,
} from "@/components/feature/helfer/availability-actions";
import { isAvailabilityTooShort } from "@/lib/events/helfer-days";
import { formatWeekdayDate } from "@/lib/utils/format";
import {
  combineDateAndMinutes,
  formatMinutesAsTime,
  minutesSinceMidnight,
} from "@/lib/utils/time-of-day";

export type HelperRoleOption = { id: string; name: string };

export type EventDayOption = {
  id: string;
  date: string;
  /** Verfügbarkeit nur innerhalb der Schichtzeiten des Tages meldbar (#674),
   * in Minuten seit Mitternacht. */
  minMinutes: number;
  maxMinutes: number;
};

export type OwnAvailability = {
  startsAt: string;
  endsAt: string;
  roleIds: string[];
};

/** Pro Event-Tag: Verfügbarkeitsfenster (00:00–24:00-Regler) + Rollen-
 * Mehrfachauswahl (#156), beschränkt auf die Rollen, für die an diesem Tag
 * tatsächlich Schichten existieren — getrennt von der admin-seitigen
 * Zeitblock-Zuweisung (Schichtplan-Editor). Jede Änderung
 * wird sofort gespeichert (#674). */
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
      : [
          Math.max(day.minMinutes, Math.min(9 * 60, day.maxMinutes)),
          Math.min(day.maxMinutes, Math.max(18 * 60, day.minMinutes)),
        ],
  );
  const [roleIds, setRoleIds] = useState<string[]>(own?.roleIds ?? []);
  const { run, pending, error } = useAction();

  /** Speichert sofort; ohne Rolle gibt es nichts anzubieten — dann wird eine
   * bestehende Meldung zurückgezogen. */
  function persist(nextRange: [number, number], nextRoleIds: string[]) {
    if (nextRoleIds.length === 0) {
      if (own) run(() => clearOwnHelperAvailability(day.id));
      return;
    }
    run(() =>
      setOwnHelperAvailability(
        day.id,
        combineDateAndMinutes(day.date, nextRange[0]),
        combineDateAndMinutes(day.date, nextRange[1]),
        nextRoleIds,
      ),
    );
  }

  function toggleRole(roleId: string, checked: boolean) {
    const next = checked
      ? [...roleIds, roleId]
      : roleIds.filter((id) => id !== roleId);
    setRoleIds(next);
    persist(range, next);
  }

  return (
    <div className="grid grid-cols-[12rem_1fr_1fr_auto] items-center gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm font-medium">{formatWeekdayDate(day.date)}</span>
      <div className="flex flex-col gap-1">
        <RangeSlider
          min={day.minMinutes}
          max={day.maxMinutes}
          step={15}
          value={range}
          onValueChange={setRange}
          onValueCommitted={(next) => persist(next, roleIds)}
          getAriaLabel={(index) => (index === 0 ? "Von" : "Bis")}
        />
        <span className="text-muted-foreground text-xs">
          {formatMinutesAsTime(range[0])} – {formatMinutesAsTime(range[1])}
        </span>
        {isAvailabilityTooShort(range) && (
          <span
            role="status"
            className="text-xs text-amber-700 dark:text-amber-400"
          >
            Empfohlen sind mindestens 2 Stunden Verfügbarkeit.
          </span>
        )}
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
                disabled={pending}
                onChange={(event) => toggleRole(role.id, event.target.checked)}
              />
              {role.name}
            </label>
          ))
        )}
      </div>
      <div className="flex items-center gap-2">
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

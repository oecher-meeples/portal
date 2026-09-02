"use client";

import { useState } from "react";
import { TimePicker, timeInputValue } from "@/components/ui/time-picker";
import { useAction } from "@/components/ui/use-action";
import { updateEventDayTimes } from "@/components/feature/admin-events/event-day-actions";
import { formatDateMedium } from "@/lib/utils/format";

export type EditableEventDay = {
  id: string;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
};

/** Combines the day's calendar date (UTC midnight, see `enumerateEventDates`)
 * with a local "HH:mm" time input into the `Date` the action expects. */
function toDateTime(dateIso: string, time: string): Date | null {
  if (!time) return null;
  return new Date(`${dateIso.slice(0, 10)}T${time}:00`);
}

/** One row: sets the opening time for a single event day (#150), independent
 * from the Ziel-Zeitraum shift roles get per day/role (#153). Speichert
 * automatisch beim Verlassen eines Felds (onBlur) statt über einen eigenen
 * Speichern-Button. */
export function EventDayTimeForm({ day }: { day: EditableEventDay }) {
  const [startsAt, setStartsAt] = useState(timeInputValue(day.startsAt));
  const [endsAt, setEndsAt] = useState(timeInputValue(day.endsAt));
  const { run, pending, error } = useAction();

  function save() {
    run(() =>
      updateEventDayTimes(day.id, {
        startsAt: toDateTime(day.date, startsAt),
        endsAt: toDateTime(day.date, endsAt),
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <span className="w-32 text-sm font-medium">
        {formatDateMedium(day.date)}
      </span>
      <TimePicker
        id={`event-day-${day.id}-starts`}
        label="Beginn"
        value={startsAt}
        onChange={setStartsAt}
        onBlur={save}
        fieldClassName="w-32"
        disabled={pending}
      />
      <TimePicker
        id={`event-day-${day.id}-ends`}
        label="Ende"
        value={endsAt}
        onChange={setEndsAt}
        onBlur={save}
        fieldClassName="w-32"
        disabled={pending}
      />
      {pending && (
        <span className="text-muted-foreground text-xs">Speichert…</span>
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

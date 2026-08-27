"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * from the Ziel-Zeitraum shift roles get per day/role (#153). */
export function EventDayTimeForm({ day }: { day: EditableEventDay }) {
  const [startsAt, setStartsAt] = useState(timeInputValue(day.startsAt));
  const [endsAt, setEndsAt] = useState(timeInputValue(day.endsAt));
  const { run, pending, error } = useAction();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          updateEventDayTimes(day.id, {
            startsAt: toDateTime(day.date, startsAt),
            endsAt: toDateTime(day.date, endsAt),
          }),
        );
      }}
    >
      <span className="w-32 text-sm font-medium">
        {formatDateMedium(day.date)}
      </span>
      <TimePicker
        id={`event-day-${day.id}-starts`}
        label="Beginn"
        value={startsAt}
        onChange={setStartsAt}
        fieldClassName="w-32"
      />
      <TimePicker
        id={`event-day-${day.id}-ends`}
        label="Ende"
        value={endsAt}
        onChange={setEndsAt}
        fieldClassName="w-32"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Save className="size-4" />
        Speichern
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </form>
  );
}

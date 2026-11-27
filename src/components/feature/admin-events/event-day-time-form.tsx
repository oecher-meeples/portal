"use client";

import { useState } from "react";
import { RangeSlider } from "@/components/ui/range-slider";
import { TimePicker, timeInputValue } from "@/components/ui/time-picker";
import { useAction } from "@/components/ui/use-action";
import { updateEventDayTimes } from "@/components/feature/admin-events/event-day-actions";
import { formatWeekdayDate } from "@/lib/utils/format";
import {
  MINUTES_PER_DAY,
  formatMinutesAsTime,
  timeStringToMinutes,
} from "@/lib/utils/time-of-day";

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
/** Neu angelegte Tage kommen ohne Zeiten (`startsAt`/`endsAt` = `null`) —
 * #459: 12:00 als Vorbelegung statt leerer Felder, damit nicht bei jedem Tag
 * manuell im Time-Picker gescrollt werden muss. Bereits gesetzte Zeiten
 * bleiben unangetastet, `||` greift nur beim leeren String aus `null`. */
const DEFAULT_OPENING_TIME = "12:00";

export function EventDayTimeForm({ day }: { day: EditableEventDay }) {
  const [startsAt, setStartsAt] = useState(
    timeInputValue(day.startsAt) || DEFAULT_OPENING_TIME,
  );
  const [endsAt, setEndsAt] = useState(
    timeInputValue(day.endsAt) || DEFAULT_OPENING_TIME,
  );
  const { run, pending, error } = useAction();

  function save(nextStartsAt = startsAt, nextEndsAt = endsAt) {
    run(() =>
      updateEventDayTimes(day.id, {
        startsAt: toDateTime(day.date, nextStartsAt),
        endsAt: toDateTime(day.date, nextEndsAt),
      }),
    );
  }

  const range: [number, number] = [
    timeStringToMinutes(startsAt),
    timeStringToMinutes(endsAt),
  ];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{formatWeekdayDate(day.date)}</span>
      <div className="flex flex-wrap items-end gap-3">
        <TimePicker
          id={`event-day-${day.id}-starts`}
          label="Beginn"
          value={startsAt}
          onChange={setStartsAt}
          onBlur={() => save()}
          fieldClassName="w-32"
          disabled={pending}
        />
        <TimePicker
          id={`event-day-${day.id}-ends`}
          label="Ende"
          value={endsAt}
          onChange={setEndsAt}
          onBlur={() => save()}
          fieldClassName="w-32"
          disabled={pending}
        />
        {pending && (
          <span className="text-muted-foreground pb-2 text-xs">Speichert…</span>
        )}
        {error && (
          <span className="text-destructive pb-2 text-xs">{error}</span>
        )}
      </div>
      <RangeSlider
        min={0}
        max={MINUTES_PER_DAY}
        step={15}
        value={range}
        onValueChange={([start, end]) => {
          setStartsAt(formatMinutesAsTime(start));
          setEndsAt(formatMinutesAsTime(end));
        }}
        onValueCommitted={([start, end]) =>
          save(formatMinutesAsTime(start), formatMinutesAsTime(end))
        }
        disabled={pending}
        getAriaLabel={(index) =>
          index === 0 ? "Beginn-Regler" : "Ende-Regler"
        }
      />
    </div>
  );
}

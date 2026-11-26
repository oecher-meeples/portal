"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
});

/** Lokaler Tagesschlüssel `YYYY-MM-DD` (ohne UTC-Verschiebung). */
export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Montag-basiertes Monatsraster; `null` = Füllzelle vor/nach dem Monat. */
export function buildMonthGrid(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Fachfreies Monatsraster mit Monats-Navigation. Welche Tage anwählbar sind
 * und welche Marker sie tragen, bestimmt der Aufrufer (`isDayEnabled`,
 * `renderMarker`) — z. B. Termin-Tage im News-Kalender oder Schicht-Tage im
 * Helferplan.
 */
export function MonthCalendar({
  selectedDate,
  onSelectDate,
  isDayEnabled,
  renderMarker,
}: {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  isDayEnabled: (dateKey: string) => boolean;
  renderMarker?: (dateKey: string) => ReactNode;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const cells = buildMonthGrid(viewMonth);
  const todayKey = toDateKey(new Date());

  return (
    <>
      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Vorheriger Monat"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {MONTH_FORMATTER.format(viewMonth)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Nächster Monat"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-muted-foreground py-1">
            {label}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={index} />;
          const key = toDateKey(date);
          const enabled = isDayEnabled(key);
          const isSelected = selectedDate === key;
          const isToday = key === todayKey;
          // Aktiver Filter: alle anderen Tage treten optisch zurück, damit
          // der ausgewählte Tag als einziger aktiver Filter erkennbar bleibt.
          const isDimmed = selectedDate !== null && !isSelected;

          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={cn(
                "hover:bg-accent relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-[opacity,background-color]",
                enabled && "font-semibold",
                !enabled && "text-muted-foreground",
                isSelected && "bg-primary text-primary-foreground",
                isToday && !isSelected && "ring-primary ring-1",
                isDimmed && "opacity-35",
              )}
            >
              {date.getDate()}
              {enabled && renderMarker?.(key)}
            </button>
          );
        })}
      </div>
    </>
  );
}

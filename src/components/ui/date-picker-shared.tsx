import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Geteilte Bausteine zwischen `DatePicker` (Einzeldatum) und
 * `DateRangePicker` (#458) — Jahres-/Monatsauswahl sind in beiden identisch,
 * nur die Tagesansicht unterscheidet sich (Einzelauswahl vs. Bereichs-Flow). */

export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const YEARS_PER_RANGE = 25;

export type View = "year" | "month" | "day";
export type SelectedDate = { year: number; month: number; day: number } | null;

/** Startansicht beim Öffnen des Popups — siehe `DatePicker`-Prop `openAt`. */
export type OpenAt = "Year" | "Month" | "Date";

export function viewForOpenAt(openAt: OpenAt): View {
  if (openAt === "Month") return "month";
  if (openAt === "Date") return "day";
  return "year";
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Montag, ... 6 = Sonntag — JS liefert 0 = Sonntag, deshalb verschoben. */
export function mondayFirstWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function parseValue(value: string): SelectedDate {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

export function formatValue(date: SelectedDate): string {
  if (!date) return "";
  const mm = String(date.month + 1).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${date.year}-${mm}-${dd}`;
}

export function isSameDate(a: SelectedDate, b: SelectedDate): boolean {
  return (
    a !== null &&
    b !== null &&
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day
  );
}

export function isBeforeDate(a: SelectedDate, b: SelectedDate): boolean {
  if (a === null || b === null) return false;
  return (
    new Date(a.year, a.month, a.day).getTime() <
    new Date(b.year, b.month, b.day).getTime()
  );
}

/** Chevron-Navigationszeile, in allen drei Ansichten identisch aufgebaut
 * (Titel mittig klickbar, Pfeile links/rechts) — ein Layout statt dreimal
 * dasselbe Grid. */
export function NavRow({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className="hover:bg-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
      >
        <ChevronLeft className="size-4" />
      </button>
      {children}
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className="hover:bg-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Gemeinsames Grid/Listen-Layout für Jahres- und Monatsauswahl — ab sm ein
 * Grid, darunter eine feste, scrollbare Listenhöhe (wächst nicht mit der
 * Anzahl der Einträge). */
export function OptionGrid<T extends string | number>({
  options,
  isSelected,
  label,
  onSelect,
  gridColsClassName,
}: {
  options: T[];
  isSelected: (option: T) => boolean;
  label: (option: T) => string;
  onSelect: (option: T) => void;
  gridColsClassName: string;
}) {
  return (
    <div className={cn("sm:grid sm:gap-1.5", gridColsClassName)}>
      <div className="max-h-64 overflow-y-auto sm:contents">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={isSelected(option)}
            className={cn(
              "flex h-11 w-full items-center justify-center rounded-md text-sm",
              isSelected(option)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {label(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field } from "@/components/ui/field";
import { formatDatePlain } from "@/lib/utils/format";
import type { Validator } from "@/components/ui/constraints";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  YEARS_PER_RANGE,
  NavRow,
  OptionGrid,
  daysInMonth,
  mondayFirstWeekday,
  parseValue,
  formatValue,
  isSameDate,
  isBeforeDate,
  viewForOpenAt,
  type View,
  type SelectedDate,
  type OpenAt,
} from "@/components/ui/date-picker-shared";

export type DateRangeValue = { start: string; end: string };

/**
 * Bereichsauswahl-Tagesansicht (#458) — anders als `DatePickerPanel`
 * (Einzeldatum, schließt sofort) bleibt das Popup nach der Start-Auswahl
 * offen und derselbe Klick-Flow legt das Ende fest:
 *
 * - Kein Ende gesetzt → nächster Klick setzt den Start (auch, um einen
 *   bereits vollständigen Bereich neu zu beginnen).
 * - Start gesetzt, Ende noch offen → nächster Klick ist der "zweite Schritt":
 *   derselbe Tag wie Start → kein Ende (Ein-Tages-Termin); ein Tag vor Start
 *   → Swap (der frühere Tag wird neuer Start, der alte Start wird Ende); ein
 *   Tag nach Start → normales Ende.
 *
 * Beide Fälle außer "kein Ende gesetzt" schließen das Popup automatisch.
 */
function DateRangePickerPanel({
  start,
  end,
  onChange,
  onCommit,
  validate,
  openAt,
}: {
  start: SelectedDate;
  end: SelectedDate;
  onChange: (start: SelectedDate, end: SelectedDate) => void;
  /** Schließt das Popup — nach allem außer der reinen Start-Auswahl. */
  onCommit: () => void;
  validate?: Validator;
  openAt: OpenAt;
}) {
  const today = new Date();
  const [view, setView] = useState<View>(viewForOpenAt(openAt));
  const [year, setYear] = useState(start?.year ?? today.getFullYear());
  const [month, setMonth] = useState(start?.month ?? today.getMonth());
  const [yearRangeStart, setYearRangeStart] = useState(
    (start?.year ?? today.getFullYear()) - (YEARS_PER_RANGE - 1),
  );

  if (view === "year") {
    const years = Array.from(
      { length: YEARS_PER_RANGE },
      (_, i) => yearRangeStart + i,
    );
    return (
      <div className="flex w-72 flex-col gap-3 p-3">
        <NavRow
          onPrev={() => setYearRangeStart((y) => y - YEARS_PER_RANGE)}
          onNext={() => setYearRangeStart((y) => y + YEARS_PER_RANGE)}
          prevLabel="25 Jahre zurück"
          nextLabel="25 Jahre vor"
        >
          <span className="text-sm font-medium">
            {years[0]}–{years[years.length - 1]}
          </span>
        </NavRow>
        <OptionGrid
          options={years}
          isSelected={(y) => y === year}
          label={(y) => String(y)}
          onSelect={(y) => {
            setYear(y);
            setView("month");
          }}
          gridColsClassName="sm:grid-cols-5"
        />
      </div>
    );
  }

  if (view === "month") {
    const months = MONTH_NAMES.map((_, index) => index);
    return (
      <div className="flex w-72 flex-col gap-3 p-3">
        <NavRow
          onPrev={() => setYear((y) => y - 1)}
          onNext={() => setYear((y) => y + 1)}
          prevLabel="Ein Jahr zurück"
          nextLabel="Ein Jahr vor"
        >
          <button
            type="button"
            onClick={() => setView("year")}
            className="hover:bg-muted rounded-md px-2 py-1 text-sm font-medium"
          >
            {year}
          </button>
        </NavRow>
        <OptionGrid
          options={months}
          isSelected={(m) => m === month}
          label={(m) => MONTH_NAMES[m].slice(0, 3)}
          onSelect={(m) => {
            setMonth(m);
            setView("day");
          }}
          gridColsClassName="sm:grid-cols-3"
        />
      </div>
    );
  }

  // view === "day"
  const leadingBlanks = mondayFirstWeekday(year, month);
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  function dateAt(day: number): SelectedDate {
    return { year, month, day };
  }
  function isStart(day: number) {
    return isSameDate(start, dateAt(day));
  }
  function isEnd(day: number) {
    return isSameDate(end, dateAt(day));
  }
  function isBetween(day: number) {
    if (!start || !end) return false;
    const date = dateAt(day);
    return isBeforeDate(start, date) && isBeforeDate(date, end);
  }

  function handleDayClick(day: number) {
    const clicked = dateAt(day);

    // Kein Start, oder bereits ein vollständiger Bereich — neu beginnen.
    if (!start || end) {
      onChange(clicked, null);
      return;
    }

    // Start gesetzt, Ende noch offen — zweiter Schritt.
    if (isSameDate(clicked, start)) {
      onChange(start, null);
      onCommit();
      return;
    }
    if (isBeforeDate(clicked, start)) {
      onChange(clicked, start);
      onCommit();
      return;
    }
    onChange(start, clicked);
    onCommit();
  }

  return (
    <div className="flex w-72 flex-col gap-3 p-3">
      <NavRow
        onPrev={() => {
          if (month === 0) {
            setMonth(11);
            setYear((y) => y - 1);
          } else {
            setMonth((m) => m - 1);
          }
        }}
        onNext={() => {
          if (month === 11) {
            setMonth(0);
            setYear((y) => y + 1);
          } else {
            setMonth((m) => m + 1);
          }
        }}
        prevLabel="Einen Monat zurück"
        nextLabel="Einen Monat vor"
      >
        <div className="flex items-center gap-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setView("month")}
            className="hover:bg-muted rounded-md px-2 py-1"
          >
            {MONTH_NAMES[month]}
          </button>
          <button
            type="button"
            onClick={() => setView("year")}
            className="hover:bg-muted rounded-md px-2 py-1"
          >
            {year}
          </button>
        </div>
      </NavRow>
      <p className="text-muted-foreground text-xs font-medium">
        {!start || end ? "Beginn wählen" : "Ende wählen"}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((weekday) => (
          <span
            key={weekday}
            className="text-muted-foreground text-xs font-medium"
          >
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const result = validate?.(new Date(year, month, day));
          const disabledReason =
            result && !result.valid ? result.reason : undefined;
          const disabled = disabledReason !== undefined;
          const edge = isStart(day) || isEnd(day);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              title={disabledReason}
              onClick={() => handleDayClick(day)}
              aria-pressed={edge}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm",
                disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : edge
                    ? "bg-primary text-primary-foreground"
                    : isBetween(day)
                      ? "bg-primary/15"
                      : isToday(day)
                        ? "ring-ring ring-1"
                        : "hover:bg-muted",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {start && end
          ? `${formatDatePlain(formatValue(start))} – ${formatDatePlain(formatValue(end))}`
          : start
            ? `Beginn: ${formatDatePlain(formatValue(start))}`
            : "Kein Zeitraum ausgewählt"}
      </p>
    </div>
  );
}

/**
 * Datumsbereichs-Feld (#458) — ersetzt zwei unabhängige `DatePicker`-
 * Instanzen für Beginn/Ende: ein Popup, ein zusammenhängender Klick-Flow.
 * Wie `DatePicker` transportieren `value.start`/`value.end` "yyyy-mm-dd"-
 * Strings, `end` bleibt optional (leerer String).
 */
export function DateRangePicker({
  id,
  label,
  value,
  onChange,
  validate,
  fieldClassName,
  required,
  disabled,
  openAt = "Year",
}: {
  id: string;
  label: ReactNode;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  validate?: Validator;
  fieldClassName?: string;
  required?: boolean;
  disabled?: boolean;
  openAt?: OpenAt;
}) {
  const [open, setOpen] = useState(false);
  const popupId = useId();
  const start = parseValue(value.start);
  const end = parseValue(value.end);

  function triggerLabel() {
    if (!start) return "Zeitraum wählen";
    if (!end) return formatDatePlain(value.start);
    return `${formatDatePlain(value.start)} – ${formatDatePlain(value.end)}`;
  }

  return (
    <Field label={label} htmlFor={id} className={fieldClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-required={required}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className={cn(!start && "text-muted-foreground")}>
            {triggerLabel()}
          </span>
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner sideOffset={4} className="z-50">
            <PopoverPrimitive.Popup
              id={popupId}
              className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 rounded-lg shadow-md ring-1 outline-none"
            >
              <DateRangePickerPanel
                start={start}
                end={end}
                validate={validate}
                openAt={openAt}
                onChange={(nextStart, nextEnd) =>
                  onChange({
                    start: formatValue(nextStart),
                    end: formatValue(nextEnd),
                  })
                }
                onCommit={() => setOpen(false)}
              />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </Field>
  );
}

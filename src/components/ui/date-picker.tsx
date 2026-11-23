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
  viewForOpenAt,
  type View,
  type SelectedDate,
  type OpenAt,
} from "@/components/ui/date-picker-shared";

/** Dreistufiger Auswahl-Flow (Live-Review F3) — ersetzt den nativen
 * `<input type="date">`, der je nach Browser/OS unterschiedlich aussieht
 * (analog `TimePicker` für `type="time"`). State bleibt beim Wechsel
 * zwischen den drei Ansichten erhalten, nichts wird zurückgesetzt. */
function DatePickerPanel({
  selected,
  onSelect,
  validate,
  openAt,
}: {
  selected: SelectedDate;
  onSelect: (date: SelectedDate) => void;
  /** Live-Review F4 — ohne `validate` verhält sich die Komponente wie in F3,
   * kein Tag gesperrt. */
  validate?: Validator;
  openAt: OpenAt;
}) {
  const today = new Date();
  // Startansicht ist standardmäßig 'year' (Live-Review F3, nachträgliche
  // Klarstellung) — auch mit vorhandenem `selected` nicht direkt in
  // Monats-/Tagesansicht springen. Aufrufer können das per `openAt`
  // überschreiben (z. B. LFG-Dialog: Termine liegen immer nahe der
  // Gegenwart, Jahresauswahl ist dort unnötiger Zwischenschritt).
  // `year`/`month`/`yearRangeStart` werden unabhängig davon sinnvoll aus
  // `selected` vorbelegt, damit die Jahres-Range das ausgewählte Jahr enthält
  // und hervorgehoben ist.
  const [view, setView] = useState<View>(viewForOpenAt(openAt));
  const [year, setYear] = useState(selected?.year ?? today.getFullYear());
  const [month, setMonth] = useState(selected?.month ?? today.getMonth());
  const [yearRangeStart, setYearRangeStart] = useState(
    (selected?.year ?? today.getFullYear()) - (YEARS_PER_RANGE - 1),
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
  const isSelectedDay = (day: number) =>
    selected?.year === year && selected.month === month && selected.day === day;

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
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              title={disabledReason}
              onClick={() => onSelect({ year, month, day })}
              aria-pressed={isSelectedDay(day)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm",
                disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : isSelectedDay(day)
                    ? "bg-primary text-primary-foreground"
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
      {selected && (
        <p className="text-muted-foreground text-xs">
          Ausgewählt: {formatDatePlain(formatValue(selected))}
        </p>
      )}
    </div>
  );
}

/**
 * Fachfreier DatePicker (Live-Review F3) — löst den nativen
 * `<input type="date">` ab, der je nach Browser/OS uneinheitlich aussieht.
 * Drop-in-Ersatz für die frühere `TextField type="date"`-Stelle: `value`/
 * `onChange` transportieren weiterhin ein "yyyy-mm-dd"-String wie ein
 * natives Date-Input.
 */
export function DatePicker({
  id,
  label,
  labelHint,
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
  /** Live-Review F5 — z. B. das aus `value` berechnete Alter beim
   * Geburtsdatum-Feld ("(34 Jahre)"), gedämpft neben dem Label. Nur gesetzt,
   * solange der Aufrufer etwas zu zeigen hat. */
  labelHint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Live-Review F4 — sperrt einzelne Tage im Kalender, siehe `constraints.ts`. */
  validate?: Validator;
  fieldClassName?: string;
  required?: boolean;
  disabled?: boolean;
  /** Startansicht beim Öffnen des Popups. Default `"Year"` — kein
   * Verhaltensbruch für bestehende Aufrufer. Für Termine nahe der Gegenwart
   * (z. B. LFG-Dialog) `"Month"`, um die unnötige Jahresauswahl zu
   * überspringen; Navigation zur Jahresansicht bleibt über den
   * Jahres-Button in der Monatsansicht weiterhin möglich. */
  openAt?: OpenAt;
}) {
  const [open, setOpen] = useState(false);
  const popupId = useId();
  const selected = parseValue(value);

  return (
    <Field
      label={
        labelHint ? (
          <span className="flex items-baseline gap-1.5">
            {label}
            <span className="text-muted-foreground font-normal">
              {labelHint}
            </span>
          </span>
        ) : (
          label
        )
      }
      htmlFor={id}
      className={fieldClassName}
    >
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-required={required}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? formatDatePlain(value) : "Datum wählen"}
          </span>
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner sideOffset={4} className="z-50">
            <PopoverPrimitive.Popup
              id={popupId}
              className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 rounded-lg shadow-md ring-1 outline-none"
            >
              <DatePickerPanel
                selected={selected}
                validate={validate}
                openAt={openAt}
                onSelect={(date) => {
                  onChange(formatValue(date));
                  setOpen(false);
                }}
              />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </Field>
  );
}

import { formatDatePlain } from "@/lib/utils/format";

/**
 * Constraint-System für `DatePicker` (Live-Review F4) — fachfreie,
 * reine Datumslogik, kein Domänen-Import. Lebt neben der Komponente statt in
 * `lib/utils/`, weil aktuell nur `date-picker.tsx` sie konsumiert; bei einem
 * zweiten, komponentenfremden Verwender wäre `lib/utils/` der bessere Ort.
 */
export type ValidationResult =
  { valid: true } | { valid: false; reason: string };
export type Validator = (date: Date) => ValidationResult;

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const VALID: ValidationResult = { valid: true };

/** Sperrt jedes Datum vor `min` (Tagesgranularität, Uhrzeit wird ignoriert). */
export function minDate(min: Date): Validator {
  const minDay = stripTime(min);
  return (date) =>
    stripTime(date) < minDay
      ? {
          valid: false,
          reason: `Datum darf nicht vor dem ${formatDatePlain(minDay)} liegen.`,
        }
      : VALID;
}

/** Sperrt jedes Datum nach `max` (Tagesgranularität, Uhrzeit wird ignoriert). */
export function maxDate(max: Date): Validator {
  const maxDay = stripTime(max);
  return (date) =>
    stripTime(date) > maxDay
      ? {
          valid: false,
          reason: `Datum darf nicht nach dem ${formatDatePlain(maxDay)} liegen.`,
        }
      : VALID;
}

/** Sperrt Samstag/Sonntag. */
export const onlyWeekdays: Validator = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6
    ? { valid: false, reason: "Wochenenden sind nicht wählbar." }
    : VALID;
};

/** Sperrt exakte Einzeltermine (Tagesgranularität). */
export function excludeDates(dates: Date[]): Validator {
  const excluded = new Set(dates.map((date) => stripTime(date).getTime()));
  return (date) =>
    excluded.has(stripTime(date).getTime())
      ? { valid: false, reason: "Dieser Tag ist nicht wählbar." }
      : VALID;
}

/** Sperrt Datumsbereiche (inklusive Start und Ende, Tagesgranularität). */
export function excludeRanges(ranges: [Date, Date][]): Validator {
  const normalized = ranges.map(
    ([start, end]) => [stripTime(start), stripTime(end)] as const,
  );
  return (date) => {
    const day = stripTime(date);
    const inRange = normalized.some(
      ([start, end]) => day >= start && day <= end,
    );
    return inRange
      ? { valid: false, reason: "Dieser Zeitraum ist nicht wählbar." }
      : VALID;
  };
}

/** Prüft der Reihe nach, gibt beim ersten Verstoß dessen `ValidationResult`
 * zurück, sonst `{ valid: true }`. */
export function combineValidators(...validators: Validator[]): Validator {
  return (date) => {
    for (const validator of validators) {
      const result = validator(date);
      if (!result.valid) return result;
    }
    return VALID;
  };
}

/** Nicht in der Zukunft, nicht älter als 100 Jahre — für Geburtsdatum-Felder
 * (Live-Review F4). Fachfrei genug für `constraints.ts` (jedes Geburtsdatum,
 * keine Vereinsmitglied-Regel): gebraucht von zwei verschiedenen
 * `feature/`-Verzeichnissen (`admin-mitglieder`, `mitglied-profil`), die laut
 * CLAUDE.md nicht voneinander importieren dürfen — hier statt doppelt
 * geschrieben. */
export function birthDateValidator(now: Date = new Date()): Validator {
  const hundredYearsAgo = new Date(
    now.getFullYear() - 100,
    now.getMonth(),
    now.getDate(),
  );
  return combineValidators(minDate(hundredYearsAgo), maxDate(now));
}

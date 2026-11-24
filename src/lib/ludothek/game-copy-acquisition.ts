/**
 * Anschaffungsdaten eines Exemplars (#615): der Wert in Cent
 * (`GameCopy.valueCents`, damit 24,99 € nicht gerundet wird) und das Datum,
 * an dem der Verein es erhalten hat (`GameCopy.acquiredOn`). `null` heißt
 * jeweils unbekannt. Nur für die Ludothek-Verwaltung (`games:manage`)
 * sichtbar.
 */

/** Obergrenze der Postgres-`INTEGER`-Spalte `GameCopy.valueCents`. */
const MAX_VALUE_CENTS = 2_147_483_647;

export const INVALID_VALUE_CENTS_ERROR =
  "Wert muss ein Betrag in Euro sein, z. B. 24,99.";

/**
 * Formular-/Import-Text → Cent. Akzeptiert deutsche Schreibweise mit
 * Tausenderpunkt (`1.234,50`), Punkt als Dezimaltrenner (`24.99`) und ein
 * nachgestelltes oder vorangestelltes `€`. Leer → `null` (unbekannt);
 * Unlesbares wird zu `NaN` und fällt bei `isValidValueCents()` durch — wie
 * `parseInventoryNumber()`.
 */
export function parseEuroToCents(raw: string): number | null {
  const trimmed = raw.replace(/€|EUR/gi, "").trim();
  if (!trimmed) return null;

  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+([.,]\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed.replace(",", ".");
  } else {
    return Number.NaN;
  }

  const [euros, fraction = ""] = normalized.split(".");
  return Number(euros) * 100 + Number(fraction.padEnd(2, "0"));
}

export function isValidValueCents(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_VALUE_CENTS;
}

/** Prüft einen Wert vor dem Speichern — `null`/`undefined` sind gültig. */
export function validateValueCents(
  value: number | null | undefined,
): string | null {
  return value == null || isValidValueCents(value)
    ? null
    : INVALID_VALUE_CENTS_ERROR;
}

const EURO_FORMAT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** `2499` → `24,99 €`. */
export function formatValueCents(cents: number): string {
  return EURO_FORMAT.format(cents / 100);
}

/** Cent → Formulartext (`2499` → `24,99`), leer bei unbekanntem Wert. */
export function valueCentsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export const INVALID_ACQUIRED_ON_ERROR =
  "„Erhalten am“ muss ein gültiges Datum sein.";

/**
 * Formulartext (`<input type="date">`, also `JJJJ-MM-TT`) → Datum um
 * Mitternacht UTC, passend zur `DATE`-Spalte. Leer → `null`; Unlesbares wird
 * zu einem ungültigen Datum und fällt bei `validateAcquiredOn()` durch.
 */
export function parseAcquiredOn(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) &&
    date.toISOString().startsWith(trimmed)
    ? date
    : new Date(Number.NaN);
}

/** Prüft ein Datum vor dem Speichern — `null`/`undefined` sind gültig, ein
 * Datum in der Zukunft nicht. */
export function validateAcquiredOn(
  value: Date | null | undefined,
  now: Date = new Date(),
): string | null {
  if (value == null) return null;
  if (Number.isNaN(value.getTime())) return INVALID_ACQUIRED_ON_ERROR;
  return value.getTime() > now.getTime()
    ? "„Erhalten am“ darf nicht in der Zukunft liegen."
    : null;
}

/** Datum → Formulartext (`JJJJ-MM-TT`), leer bei unbekanntem Datum. */
export function acquiredOnToInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** `2024-03-05` → `05.03.2024` — rein textuell, ohne Zeitzonenversatz. */
export function formatAcquiredOn(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

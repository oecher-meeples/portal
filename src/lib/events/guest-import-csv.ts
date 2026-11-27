import { detectCsvDelimiter, parseCsvRows } from "@/lib/utils/csv";

/**
 * Parser für den Gast-Helfer-Import (#698): `Name; Tag; Von; Bis; Rollen`.
 * Rein, ohne `server-only` — läuft im Browser, die Actions bekommen nur die
 * geparsten Zeilen. Meldungen nennen nur Zeilennummer und Feld, nie Namen.
 */

export const GUEST_IMPORT_HEADER = [
  "name",
  "tag",
  "von",
  "bis",
  "rollen",
] as const;

export type GuestImportContext = {
  /** `date` = ISO-String des Tages (UTC-Mitternacht, wie `EventDay.date`). */
  days: { id: string; date: string }[];
  roles: { id: string; name: string }[];
};

export type GuestImportRow = {
  line: number;
  name: string;
  dayId: string;
  startsAt: string;
  endsAt: string;
  roleIds: string[];
};

export type GuestImportLineError = { line: number; message: string };

export type ParsedGuestImport = {
  rows: GuestImportRow[];
  errors: GuestImportLineError[];
};

/** Trim, Mehrfach-Whitespace → ein Leerzeichen, klein — Schlüssel für Gäste. */
export function guestNameKey(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

function parseTime(value: string): { hours: number; minutes: number } | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null;
}

function findDay(value: string, days: GuestImportContext["days"]) {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const [day, month, year] = [match[1], match[2], match[3]].map(Number);
  return (
    days.find((candidate) => {
      const date = new Date(candidate.date);
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day
      );
    }) ?? null
  );
}

export function parseGuestImportCsv(
  text: string,
  context: GuestImportContext,
): ParsedGuestImport {
  const delimiter = detectCsvDelimiter(text);
  // Leere Zeilen behalten (Trennzeichen), damit Zeilennummern stimmen.
  const table = parseCsvRows(
    text.replace(/(^|\n)(?=\r?\n)/g, `$1${delimiter}`),
    delimiter,
  );
  const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const headerMatches =
    header.length === GUEST_IMPORT_HEADER.length &&
    GUEST_IMPORT_HEADER.every((name, index) => header[index] === name);
  if (!headerMatches) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Kopfzeile muss „Name;Tag;Von;Bis;Rollen“ lauten.`,
        },
      ],
    };
  }

  const rolesByName = new Map(
    context.roles.map((role) => [role.name.trim().toLowerCase(), role.id]),
  );
  const rows: GuestImportRow[] = [];
  const errors: GuestImportLineError[] = [];
  const fail = (line: number, field: string) =>
    errors.push({ line, message: `Zeile ${line}: ${field} ungültig.` });

  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === "")) return;

    const [rawName, rawDay, rawFrom, rawTo, rawRoles] = cells;
    const name = normalizeWhitespace(rawName ?? "");
    if (!name) return fail(line, "Name");
    const day = findDay(rawDay ?? "", context.days);
    if (!day) return fail(line, "Tag");
    const from = parseTime(rawFrom ?? "");
    if (!from) return fail(line, "Von");
    const to = parseTime(rawTo ?? "");
    if (!to) return fail(line, "Bis");

    const date = new Date(day.date);
    const at = (time: { hours: number; minutes: number }) =>
      new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        time.hours,
        time.minutes,
      );
    const startsAt = at(from);
    const endsAt = at(to);
    if (endsAt <= startsAt) return fail(line, "Bis");

    const roleNames = (rawRoles ?? "")
      .split(",")
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
    const roleIds = roleNames.map((role) => rolesByName.get(role));
    if (roleIds.length === 0 || roleIds.some((id) => id === undefined)) {
      return fail(line, "Rollen");
    }

    rows.push({
      line,
      name,
      dayId: day.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      roleIds: [...new Set(roleIds as string[])],
    });
  });

  return { rows, errors };
}

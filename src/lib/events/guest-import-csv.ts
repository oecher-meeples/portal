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
  /** Bereits eindeutig zugeordnete Rollen. */
  roleIds: string[];
  /** Rollen, die beim Import neu angelegt werden (nach der Zuordnung). */
  newRoleNames: string[];
  /** Noch nicht zugeordnete Rollennamen der Datei (Originalschreibweise) —
   * `applyRoleChoices` löst sie auf. */
  unknownRoleNames: string[];
};

/** Entscheidung pro unbekanntem Rollennamen im Import-Dialog. */
export type GuestRoleChoice =
  { kind: "role"; roleId: string } | { kind: "create" } | { kind: "skip" };

export function roleNameKey(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

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
    context.roles.map((role) => [roleNameKey(role.name), role.id]),
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
      .map((role) => normalizeWhitespace(role))
      .filter(Boolean);
    if (roleNames.length === 0) return fail(line, "Rollen");
    const roleIds = new Set<string>();
    const unknown = new Map<string, string>();
    for (const roleName of roleNames) {
      const id = rolesByName.get(roleNameKey(roleName));
      if (id) roleIds.add(id);
      else unknown.set(roleNameKey(roleName), roleName);
    }

    rows.push({
      line,
      name,
      dayId: day.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      roleIds: [...roleIds],
      newRoleNames: [],
      unknownRoleNames: [...unknown.values()],
    });
  });

  return { rows, errors };
}

/** Alle unbekannten Rollennamen der Zeilen, eindeutig (case-insensitiv). */
export function collectUnknownRoleNames(rows: GuestImportRow[]): string[] {
  const names = new Map<string, string>();
  for (const row of rows) {
    for (const name of row.unknownRoleNames) {
      if (!names.has(roleNameKey(name))) names.set(roleNameKey(name), name);
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "de"));
}

/** Vorschlag: eine vorhandene Rolle, deren Name den unbekannten enthält oder
 * darin enthalten ist ("Aufbau" → "Aufbau/Abbau"), sonst neu anlegen. */
export function suggestRoleChoice(
  name: string,
  roles: GuestImportContext["roles"],
): GuestRoleChoice {
  const key = roleNameKey(name);
  const match = roles.find((role) => {
    const roleKey = roleNameKey(role.name);
    return roleKey.includes(key) || key.includes(roleKey);
  });
  return match ? { kind: "role", roleId: match.id } : { kind: "create" };
}

/** Löst die unbekannten Rollennamen per Entscheidung auf. Zeilen, die danach
 * keine Rolle mehr haben, entfallen und werden als Fehler gemeldet. */
export function applyRoleChoices(
  parsed: ParsedGuestImport,
  choices: Record<string, GuestRoleChoice>,
): ParsedGuestImport {
  const rows: GuestImportRow[] = [];
  const errors = [...parsed.errors];
  for (const row of parsed.rows) {
    const roleIds = new Set(row.roleIds);
    const newRoleNames = new Map<string, string>();
    for (const name of row.unknownRoleNames) {
      const choice = choices[roleNameKey(name)] ?? { kind: "create" };
      if (choice.kind === "role") roleIds.add(choice.roleId);
      else if (choice.kind === "create") {
        newRoleNames.set(roleNameKey(name), name);
      }
    }
    if (roleIds.size === 0 && newRoleNames.size === 0) {
      errors.push({
        line: row.line,
        message: `Zeile ${row.line}: keine Rolle übrig.`,
      });
      continue;
    }
    rows.push({
      ...row,
      roleIds: [...roleIds],
      newRoleNames: [...newRoleNames.values()],
      unknownRoleNames: [],
    });
  }
  errors.sort((a, b) => a.line - b.line);
  return { rows, errors };
}

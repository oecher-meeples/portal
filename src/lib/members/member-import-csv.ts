import { detectCsvDelimiter, parseCsvRows } from "@/lib/utils/csv";
import { isValidEmail } from "@/lib/utils/validate-email";

/**
 * Parser für den Mitgliederlisten-Export der Vereinsverwaltung (#611) —
 * rein, ohne `server-only`: läuft im Browser (die Rohdatei verlässt ihn nie)
 * und wird auf dem Server nicht gebraucht, die Actions bekommen nur die
 * geparsten Zeilen.
 *
 * Meldungen nennen bewusst nur Zeilennummer und Feld, nie Inhalte
 * (Datenschutz: Namen/E-Mail-Adressen gehören in keine Logs).
 */

export const MEMBER_IMPORT_HEADER = [
  "mitglied_email",
  "mitglied_name",
  "mitglied_vorname",
  "mitglied_nr",
] as const;

const BYTE_ORDER_MARK = 0xfeff;

/** `OEMe.V.076` → 76. */
const MEMBER_NUMBER_PATTERN = /^OEMe\.V\.(\d+)$/;

export type MemberImportRow = {
  /** Zeilennummer in der Datei (Kopfzeile = 1) — Bezug für alle Meldungen
   * und für Erziehungsberechtigten-Verweise zwischen Zeilen. */
  line: number;
  memberNumber: number;
  firstName: string | null;
  lastName: string | null;
  /** Getrimmt und lowercased, `null` bei leerem Feld. */
  email: string | null;
};

export type MemberImportLineError = { line: number; message: string };

export type ParsedMemberImport = {
  rows: MemberImportRow[];
  errors: MemberImportLineError[];
};

/** Dekodiert die hochgeladene Datei: erst strikt als UTF-8, bei Fehlschlag
 * als Windows-1252 (so exportiert die Vereinsverwaltung, sonst gehen
 * Umlaute kaputt). Ein BOM wird entfernt. */
export function decodeMemberCsv(buffer: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("windows-1252").decode(buffer);
  }
  return text.charCodeAt(0) === BYTE_ORDER_MARK ? text.slice(1) : text;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function parseMemberImportCsv(text: string): ParsedMemberImport {
  const delimiter = detectCsvDelimiter(text);
  // `parseCsvRows` verwirft leere Zeilen ganz — ein Trennzeichen darin hält
  // sie als leere Zeile, damit die Zeilennummern der Datei stimmen.
  const table = parseCsvRows(
    text.replace(/(^|\n)(?=\r?\n)/g, `$1${delimiter}`),
    delimiter,
  );
  const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const headerMatches =
    header.length === MEMBER_IMPORT_HEADER.length &&
    MEMBER_IMPORT_HEADER.every((name, index) => header[index] === name);
  if (!headerMatches) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Kopfzeile muss „${MEMBER_IMPORT_HEADER.join(";")}“ lauten.`,
        },
      ],
    };
  }

  const candidates: MemberImportRow[] = [];
  const errors: MemberImportLineError[] = [];

  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === "")) return;

    const [rawEmail, rawLastName, rawFirstName, rawNumber] = cells;
    const numberMatch = MEMBER_NUMBER_PATTERN.exec(rawNumber?.trim() ?? "");
    if (!numberMatch) {
      errors.push({ line, message: `Zeile ${line}: mitglied_nr ungültig.` });
      return;
    }
    const email = emptyToNull(rawEmail)?.toLowerCase() ?? null;
    if (email && !isValidEmail(email)) {
      errors.push({
        line,
        message: `Zeile ${line}: mitglied_email ungültig.`,
      });
      return;
    }
    candidates.push({
      line,
      memberNumber: Number.parseInt(numberMatch[1], 10),
      firstName: emptyToNull(rawFirstName),
      lastName: emptyToNull(rawLastName),
      email,
    });
  });

  const countByNumber = new Map<number, number>();
  for (const row of candidates) {
    countByNumber.set(
      row.memberNumber,
      (countByNumber.get(row.memberNumber) ?? 0) + 1,
    );
  }
  const rows: MemberImportRow[] = [];
  for (const row of candidates) {
    if ((countByNumber.get(row.memberNumber) ?? 0) > 1) {
      errors.push({
        line: row.line,
        message: `Zeile ${row.line}: mitglied_nr kommt in der Datei mehrfach vor.`,
      });
    } else {
      rows.push(row);
    }
  }

  errors.sort((a, b) => a.line - b.line);
  return { rows, errors };
}

/** Zeilen mit identischer E-Mail (nur Gruppen ab zwei Zeilen) — nie über den
 * Namen gruppiert (Doppelnamen, Patchwork, #611). `email` ist bereits
 * lowercased, die Gruppierung damit case-insensitiv. */
export function groupByEmail(
  rows: MemberImportRow[],
): Map<string, MemberImportRow[]> {
  const byEmail = new Map<string, MemberImportRow[]>();
  for (const row of rows) {
    if (!row.email) continue;
    byEmail.set(row.email, [...(byEmail.get(row.email) ?? []), row]);
  }
  for (const [email, group] of byEmail) {
    if (group.length < 2) byEmail.delete(email);
  }
  return byEmail;
}

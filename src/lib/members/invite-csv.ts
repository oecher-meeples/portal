import { detectCsvDelimiter, parseCsvRows } from "@/lib/utils/csv";

export type InviteCsvError = {
  line: number;
  message: string;
};

export type ParsedInviteCsv = {
  emails: string[];
  errors: InviteCsvError[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses the CSV-Bulk-Einladung format (#265): single `email` column,
 * one row per to-be-invited member. Reuses the shared CSV primitives
 * (`parseCsvRows`/`detectCsvDelimiter`) instead of the flea-market import's
 * hand-rolled line splitter — same pattern, DRY against `lib/utils/csv.ts`.
 * Duplicate emails within the file collapse to one entry; matching against
 * an actual `Member` happens server-side in the import action.
 */
export function parseInviteCsv(raw: string): ParsedInviteCsv {
  const delimiter = detectCsvDelimiter(raw);
  const rows = parseCsvRows(raw.trim(), delimiter);

  if (rows.length === 0) {
    return { emails: [], errors: [] };
  }

  const header = rows[0].map((field) => field.trim().toLowerCase());
  if (header.length !== 1 || header[0] !== "email") {
    return {
      emails: [],
      errors: [
        { line: 1, message: "Ungültige Kopfzeile. Erwartet wird: email" },
      ],
    };
  }

  const emails: string[] = [];
  const errors: InviteCsvError[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const lineNumber = i + 1;
    const email = (rows[i][0] ?? "").trim();

    if (!email) {
      errors.push({
        line: lineNumber,
        message: `Zeile ${lineNumber}: E-Mail fehlt`,
      });
      continue;
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.push({
        line: lineNumber,
        message: `Zeile ${lineNumber}: „${email}“ ist keine gültige E-Mail-Adresse`,
      });
      continue;
    }

    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }

  return { emails, errors };
}

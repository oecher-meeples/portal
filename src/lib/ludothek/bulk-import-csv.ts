import { isValidEan } from "@/lib/inventory/ean";
import { detectCsvDelimiter, parseCsvRows } from "@/lib/utils/csv";

/** Column names a header row is likely to use, in either language — matched
 * case-insensitively. Not exhaustive, just the obvious candidates (#186). */
const HEADER_KEYWORDS = new Set([
  "ean",
  "upc",
  "gtin",
  "barcode",
  "code",
  "titel",
  "title",
  "name",
  "spiel",
  "spieletitel",
]);

/**
 * A row counts as a header when none of its cells look like a valid EAN
 * (an EAN row could coincidentally contain e.g. "code") and at least one
 * cell matches a known column name — otherwise every row is treated as data.
 */
function looksLikeHeaderRow(row: string[]): boolean {
  if (row.some((cell) => isValidEan(cell.trim()))) return false;
  return row.some((cell) => HEADER_KEYWORDS.has(cell.trim().toLowerCase()));
}

/**
 * Parses an uploaded CSV into bulk-import entries (#186-Folge) — one EAN or
 * Titel per non-empty cell, across every column. Works for a single-column
 * list, a two-column EAN+Titel export, or any other layout, without
 * requiring a fixed column order; an optional header row is detected and
 * skipped automatically instead of being imported as a bogus entry.
 *
 * `joinCellsWith` (#289): when the Inventarnummer-Trennzeichen-Dropdown is
 * set, a row's cells are joined with it instead of flattened independently —
 * a two-column CSV (Inventarnummer + Name/EAN) then produces one
 * `"Inventarnummer<Trennzeichen>Name"`-Eintrag per row, matching what
 * `bulkImportBoardGames()` expects to split back apart. A single-cell row
 * naturally ends up without the delimiter, i.e. as a plain entry.
 */
export function parseBulkImportCsv(
  text: string,
  joinCellsWith?: string,
): string[] {
  const delimiter = detectCsvDelimiter(text);
  const rows = parseCsvRows(text, delimiter);
  if (rows.length === 0) return [];

  const dataRows = looksLikeHeaderRow(rows[0]) ? rows.slice(1) : rows;

  if (joinCellsWith) {
    return dataRows
      .map((row) =>
        row
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(joinCellsWith),
      )
      .filter(Boolean);
  }

  return dataRows
    .flatMap((row) => row.map((cell) => cell.trim()))
    .filter(Boolean);
}

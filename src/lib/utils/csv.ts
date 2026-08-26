/** Wraps a CSV field in double quotes (doubling any inner quotes) when it
 * contains the delimiter, a quote, or a newline — otherwise returns it as-is.
 * Shared by every CSV export in this app (bank data, Ludothek-Bestand, …). */
export function escapeCsvField(
  value: string | number,
  delimiter: string,
): string {
  const text = String(value);
  if (text.includes(delimiter) || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Triggers a browser download of a CSV string — UTF-8 with a leading BOM so
 * Excel opens umlauts correctly instead of guessing the wrong encoding. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Whichever of `,`/`;` occurs more often in the first line — Excel exports
 * with a German locale use `;`, everything else typically uses `,` (#186). */
export function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Inverse of `escapeCsvField()`: quoted fields (with doubled inner quotes
 * and embedded delimiters/newlines) and plain fields, split on `delimiter`.
 * Drops a single trailing blank line so a file ending in a newline doesn't
 * produce a spurious empty row. */
export function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignored — paired \n (if any) ends the row below
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

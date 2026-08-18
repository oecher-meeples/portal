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

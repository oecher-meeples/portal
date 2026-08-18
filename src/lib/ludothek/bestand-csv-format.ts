import { escapeCsvField } from "@/lib/utils/csv";

/** The only columns the Bestands-Export ever contains (#198). */
export const BESTAND_CSV_COLUMNS = [
  "Titel",
  "EAN",
  "Status",
  "Zustand",
  "Standort-Kette",
] as const;

/** One row shaped for the CSV export — a subset of `AdminBoardGameRow`. */
export type BestandCsvRow = {
  title: string;
  ean: string | null;
  status: string;
  zustand: string;
  locationChain: string;
};

function csvCell(value: string | number) {
  return escapeCsvField(value, ";");
}

/**
 * Pure and unit-testable on purpose — kept out of `bestand-csv.ts` because a
 * `"use server"` file may only export async functions (Next.js Server
 * Actions), and this one deliberately isn't one.
 */
export function buildBestandCsv(rows: BestandCsvRow[]): string {
  const lines = rows.map((row) =>
    [row.title, row.ean ?? "", row.status, row.zustand, row.locationChain]
      .map(csvCell)
      .join(";"),
  );
  return [BESTAND_CSV_COLUMNS.join(";"), ...lines].join("\r\n");
}

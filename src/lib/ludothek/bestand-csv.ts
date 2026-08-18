"use server";

import { escapeCsvField } from "@/lib/utils/csv";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { buildAdminBoardGameRows } from "@/lib/ludothek/admin-bestand-rows";

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

/** Pure and unit-testable on purpose — the action below only adds auth + data fetching. */
export function buildBestandCsv(rows: BestandCsvRow[]): string {
  const lines = rows.map((row) =>
    [row.title, row.ean ?? "", row.status, row.zustand, row.locationChain]
      .map(csvCell)
      .join(";"),
  );
  return [BESTAND_CSV_COLUMNS.join(";"), ...lines].join("\r\n");
}

export type BestandCsvScope = "filtered" | "all" | "all-with-deinventarised";

/**
 * "filtered" reuses the rows already visible in the browser's own `filtered`
 * memo — no re-query, exports exactly what's on screen. "all" and
 * "all-with-deinventarised" re-fetch server-side so the export isn't capped
 * by whatever page of results the browser happens to hold.
 */
export async function exportBestandCsv(
  scope: BestandCsvScope,
  filteredRows?: BestandCsvRow[],
) {
  const actor = await requireGamesManagePermission();
  if (!actor) {
    return { error: "Keine Berechtigung für den Bestands-Export." };
  }

  if (scope === "filtered") {
    return {
      success: true as const,
      filename: "bestand-gefiltert.csv",
      csv: buildBestandCsv(filteredRows ?? []),
    };
  }

  const showDeinventarised = scope === "all-with-deinventarised";
  const rows = await buildAdminBoardGameRows({ showDeinventarised });

  return {
    success: true as const,
    filename: showDeinventarised
      ? "bestand-mit-deinventarisierten.csv"
      : "bestand-vollstaendig.csv",
    csv: buildBestandCsv(rows),
  };
}

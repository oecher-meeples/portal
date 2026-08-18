"use server";

import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { buildAdminBoardGameRows } from "@/lib/ludothek/admin-bestand-rows";
import {
  buildBestandCsv,
  type BestandCsvRow,
} from "@/lib/ludothek/bestand-csv-format";

export type { BestandCsvRow } from "@/lib/ludothek/bestand-csv-format";

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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { downloadCsv } from "@/lib/utils/csv";
import {
  exportBestandCsv,
  type BestandCsvRow,
  type BestandCsvScope,
} from "@/lib/ludothek/bestand-csv";

const SCOPE_OPTIONS: { value: BestandCsvScope; label: string }[] = [
  { value: "filtered", label: "Nur die aktuell gefilterte Ansicht" },
  { value: "all", label: "Gesamter Bestand (ohne Deinventarisierte)" },
  {
    value: "all-with-deinventarised",
    label: "Gesamter Bestand inkl. Deinventarisierte",
  },
];

export function AdminBestandCsvExportDialog({
  filteredRows,
}: {
  filteredRows: BestandCsvRow[];
}) {
  const [scope, setScope] = useState<BestandCsvScope>("filtered");

  async function handleExport() {
    const result = await exportBestandCsv(
      scope,
      scope === "filtered" ? filteredRows : undefined,
    );
    if ("error" in result) return result;

    downloadCsv(result.filename, result.csv);
    return { success: true as const };
  }

  return (
    <ActionDialog
      trigger={<Button variant="outline">CSV-Export</Button>}
      title="Bestand als CSV exportieren"
      description="Titel, EAN, Status, Zustand und Standort-Kette pro physischem Exemplar."
      submitLabel="Export starten"
      pendingLabel="Erzeuge CSV …"
      action={handleExport}
      onReset={() => setScope("filtered")}
    >
      <div className="flex flex-col gap-2">
        {SCOPE_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="bestand-csv-scope"
              value={option.value}
              checked={scope === option.value}
              onChange={() => setScope(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </ActionDialog>
  );
}

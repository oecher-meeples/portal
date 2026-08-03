"use client";

import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { exportBankDataCsv } from "@/components/feature/admin-bank/actions";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Access control and logging around the export are already correct; the gap this
 * closes is the handover — once the file is on a laptop no technical control
 * applies any more, and nothing in the UI used to say what is inside it.
 */
export function BankCsvExportDialog({ ibanCount }: { ibanCount: number }) {
  async function handleExport() {
    const result = await exportBankDataCsv();
    if (!("csv" in result)) return result;

    downloadCsv(result.filename, result.csv);
    return { success: true as const };
  }

  return (
    <ActionDialog
      trigger={
        <Button disabled={ibanCount === 0}>CSV für die Banking-Software</Button>
      }
      title="Unverschlüsselte IBANs exportieren"
      description={`Die Datei enthält ${ibanCount} vollständige, unverschlüsselte ${
        ibanCount === 1 ? "IBAN" : "IBANs"
      } im Klartext.`}
      submitLabel="Export starten"
      pendingLabel="Erzeuge CSV …"
      action={handleExport}
    >
      <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
        <li>
          Nur auf einem Gerät speichern, auf das niemand sonst Zugriff hat —
          nicht in einer Cloud, nicht per E-Mail weitergeben.
        </li>
        <li>
          Nach dem Einlesen in die Banking-Software wieder löschen, auch aus dem
          Papierkorb. Ab dem Download greift keine technische Kontrolle mehr.
        </li>
        <li>
          Dieser Export wird mit deinem Namen und Zeitstempel protokolliert.
        </li>
      </ul>
    </ActionDialog>
  );
}

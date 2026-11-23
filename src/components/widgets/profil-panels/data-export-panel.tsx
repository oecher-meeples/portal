"use client";

import { ActionButton } from "@/components/ui/action-button";
import { exportOwnPersonalData } from "@/lib/members/own-profile-actions";

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DataExportPanel() {
  async function handleExport() {
    const result = await exportOwnPersonalData();
    if (!("data" in result)) return result;

    downloadJson(
      `oecher-meeples-datenexport-${result.data.exportedAt.slice(0, 10)}.json`,
      result.data,
    );
    return { success: true as const };
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-muted-foreground text-sm">
        Du kannst alle zu dir gespeicherten Daten als JSON-Datei herunterladen
        (Art. 15 und Art. 20 DSGVO). Die vollständige IBAN ist bewusst nicht
        enthalten, sondern nur die letzten vier Stellen — für die vollständige
        Bankverbindung wende dich an den Kassenwart.
      </p>
      <ActionButton
        action={handleExport}
        refresh={false}
        variant="outline"
        pendingLabel="Erstelle Export …"
      >
        Meine Daten exportieren (JSON)
      </ActionButton>
    </div>
  );
}

"use client";

import { FileDown } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { exportShiftPlanPdf } from "@/components/feature/admin-events/shift-plan-export-actions";
import { downloadBlob } from "@/lib/utils/download-blob";

/** "Als PDF exportieren" für den ganzen Schichtplan des Events (#697). */
export function ShiftPlanPdfExportButton({ eventId }: { eventId: string }) {
  async function handleExport() {
    const result = await exportShiftPlanPdf(eventId);
    if ("error" in result) return result;

    const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
    downloadBlob(
      result.filename,
      new Blob([bytes], { type: "application/pdf" }),
    );
    return { success: true as const };
  }

  return (
    <ActionButton
      variant="outline"
      size="sm"
      action={handleExport}
      refresh={false}
    >
      <FileDown className="size-4" />
      Als PDF exportieren
    </ActionButton>
  );
}

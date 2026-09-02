"use client";

import { Download } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { exportShiftPlanDayCsv } from "@/components/feature/admin-events/shift-plan-export-actions";
import { downloadCsv } from "@/lib/utils/csv";

/** "Als CSV exportieren" pro Tag im Schichtplan-Editor (#296) — PDF-Export
 * ist bewusst nicht Teil davon, siehe Issue. */
export function ShiftPlanCsvExportButton({ dayId }: { dayId: string }) {
  async function handleExport() {
    const result = await exportShiftPlanDayCsv(dayId);
    if ("error" in result) return result;

    downloadCsv(result.filename, result.csv);
    return { success: true as const };
  }

  return (
    <ActionButton
      variant="outline"
      size="sm"
      action={handleExport}
      refresh={false}
    >
      <Download className="size-4" />
      Als CSV exportieren
    </ActionButton>
  );
}

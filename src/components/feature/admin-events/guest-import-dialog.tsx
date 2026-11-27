"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { FileField } from "@/components/ui/file-field";
import { decodeCsvBuffer } from "@/lib/utils/csv";
import {
  parseGuestImportCsv,
  type GuestImportContext,
  type ParsedGuestImport,
} from "@/lib/events/guest-import-csv";
import { commitGuestImport } from "@/components/feature/admin-events/guest-import-actions";

/**
 * Gast-Helfer per CSV importieren (#698): Datei wird im Browser gelesen und
 * geparst, die Vorschau zeigt gültige und verworfene Zeilen, übernommen
 * werden nur die gültigen.
 */
export function GuestImportDialog({
  eventId,
  days,
  helperRoles,
}: {
  eventId: string;
  days: GuestImportContext["days"];
  helperRoles: GuestImportContext["roles"];
}) {
  const [parsed, setParsed] = useState<ParsedGuestImport | null>(null);

  async function handleFile(file: File) {
    setParsed(
      parseGuestImportCsv(decodeCsvBuffer(await file.arrayBuffer()), {
        days,
        roles: helperRoles,
      }),
    );
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <Upload className="size-4" />
          Gast-Helfer importieren
        </Button>
      }
      title="Gast-Helfer importieren"
      description="CSV mit den Spalten Name;Tag;Von;Bis;Rollen (Tag TT.MM.JJJJ, Zeit HH:MM, Rollen kommagetrennt). Gäste ohne Account erscheinen im Helferpool; erneutes Importieren ersetzt ihre Meldung für den Tag."
      submitLabel="Importieren"
      canSubmit={(parsed?.rows.length ?? 0) > 0}
      onReset={() => setParsed(null)}
      action={async () => {
        if (!parsed) return { error: "Bitte zuerst eine Datei wählen." };
        const result = await commitGuestImport(eventId, parsed.rows);
        return "error" in result ? result : { success: true };
      }}
    >
      <FileField
        id="guest-import-file"
        label="CSV-Datei"
        accept=".csv,text/csv"
        onFilesSelected={(files) => {
          if (files[0]) void handleFile(files[0]);
        }}
      />
      {parsed && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {parsed.rows.length} Zeile(n) werden importiert
            {parsed.errors.length > 0 && `, ${parsed.errors.length} verworfen`}.
          </p>
          {parsed.errors.length > 0 && (
            <ul className="text-destructive list-disc pl-5">
              {parsed.errors.map((error) => (
                <li key={error.line}>{error.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ActionDialog>
  );
}

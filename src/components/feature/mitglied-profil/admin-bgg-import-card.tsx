"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { adminSyncPrivateBggCollection } from "@/lib/ludothek/private-collection-sync";
import {
  ImportJobStatus,
  isImportActive,
  type ImportJobSummary,
} from "@/components/widgets/private-collection/import-job-status";

/** Admin-Karte auf einem fremden Profil (#632): den privaten BGG-Import für
 * dieses Mitglied erneut anstoßen, falls er dort schiefgegangen ist. Eigene
 * `"use client"`-Grenze nötig für Button + Erfolgsmeldung. */
export function AdminBggImportCard({
  meepleId,
  bggUsername,
  importedCount,
  latestImportJob,
}: {
  meepleId: string;
  bggUsername: string;
  importedCount: number;
  latestImportJob: ImportJobSummary | null;
}) {
  return (
    <Card className="gap-2">
      <CardTitle>BGG-Import (Admin)</CardTitle>
      <p className="text-muted-foreground text-sm">
        BGG-Benutzername: <span className="font-medium">{bggUsername}</span> ·
        aktuell {importedCount} {importedCount === 1 ? "Spiel" : "Spiele"}{" "}
        importiert.
      </p>
      <ActionButton
        refresh
        action={() => adminSyncPrivateBggCollection(meepleId)}
        disabled={isImportActive(latestImportJob)}
        variant="outline"
        size="sm"
        className="w-fit"
        pendingLabel="Importiere…"
      >
        Import erneut anstoßen
      </ActionButton>
      <ImportJobStatus job={latestImportJob} />
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { deleteMemberPermanently } from "@/components/feature/admin-mitglieder/actions";

/** Stufe 3 (#331) — die `Member`-Zeile selbst verschwindet, nicht nur ihre
 * Felder. Doppelte Bestätigung wie bei der Anonymisierung (Stufe 1/2). */
export function DeleteMemberDialog({
  memberId,
  displayName,
}: {
  memberId: string;
  displayName: string;
}) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 />
          Endgültig löschen
        </Button>
      }
      title={`Vereinsmitgliedschaft von „${displayName}“ endgültig löschen`}
      description="Löscht die Vereinsmitglied-Zeile vollständig aus der Datenbank (Stufe 3). Abgeschlossene Ausleihen bleiben als namenloser Rest lesbar."
      submitLabel="Endgültig löschen"
      pendingLabel="Lösche…"
      submitVariant="destructive"
      canSubmit={confirmText.trim() === displayName}
      action={() => deleteMemberPermanently(memberId)}
      onReset={() => setConfirmText("")}
    >
      <TextField
        id={`confirm-delete-member-${memberId}`}
        label={`Gib zur Bestätigung „${displayName}“ ein`}
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        autoComplete="off"
      />
    </ActionDialog>
  );
}

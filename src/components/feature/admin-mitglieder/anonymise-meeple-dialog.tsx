"use client";

import { useState } from "react";
import { ShieldOff } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { anonymiseMeeple } from "@/components/feature/admin-mitglieder/actions";

/**
 * Doppelte Bestätigung für eine unwiderrufliche Aktion: das Öffnen des Dialogs
 * ist die erste, das exakte Eintippen des Anzeigenamens die zweite — erst
 * dann schaltet der Button frei.
 */
export function AnonymiseMeepleDialog({
  meepleId,
  displayName,
}: {
  meepleId: string;
  displayName: string;
}) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <ShieldOff />
          Anonymisieren
        </Button>
      }
      title={`„${displayName}“ anonymisieren`}
      description="Löscht unwiderruflich das Login-Konto, den Namen, die E-Mail-Adresse und alle Bankdaten dieses Mitglieds. Aufenthalte und Spielergesuche bleiben als namenloser Rest lesbar."
      submitLabel="Endgültig anonymisieren"
      pendingLabel="Anonymisiere…"
      submitVariant="destructive"
      canSubmit={confirmText.trim() === displayName}
      action={() => anonymiseMeeple(meepleId)}
      onReset={() => setConfirmText("")}
    >
      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        <li>Login-Konto und Sitzungen (Neon Auth)</li>
        <li>Anzeigename, E-Mail, BGG-/BGA-Username</li>
        <li>Kontoinhaber, IBAN</li>
      </ul>
      <TextField
        id={`confirm-anonymise-${meepleId}`}
        label={`Gib zur Bestätigung „${displayName}“ ein`}
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        autoComplete="off"
      />
    </ActionDialog>
  );
}

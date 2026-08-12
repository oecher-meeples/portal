"use client";

import { ShieldOff } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { anonymiseMeeple } from "@/components/feature/admin-mitglieder/actions";

export function AnonymiseMeepleDialog({
  meepleId,
  displayName,
}: {
  meepleId: string;
  displayName: string;
}) {
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
      action={() => anonymiseMeeple(meepleId)}
    >
      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        <li>Login-Konto und Sitzungen (Neon Auth)</li>
        <li>Anzeigename, E-Mail, BGG-/BGA-Username</li>
        <li>Kontoinhaber, IBAN</li>
      </ul>
    </ActionDialog>
  );
}

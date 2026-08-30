"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { requestOwnEmailChange } from "@/components/feature/profil/actions";

/** #330: die Vereinsmitglied-E-Mail (nicht die Login-E-Mail) — Änderung
 * braucht Bestätigungslink + Vorstandsfreigabe, wird hier nicht sofort
 * übernommen. */
export function MemberEmailChangeDialog({
  currentEmail,
}: {
  currentEmail: string | null;
}) {
  const [email, setEmail] = useState(currentEmail ?? "");

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          <Pencil className="size-3.5" />
          Ändern
        </Button>
      }
      title="E-Mail-Adresse ändern"
      description="Du bekommst einen Bestätigungslink an die neue Adresse. Danach muss der Vorstand die Änderung noch freigeben."
      submitLabel="Bestätigungslink anfordern"
      canSubmit={email.trim().length > 0}
      action={() => requestOwnEmailChange(email)}
      onReset={() => setEmail(currentEmail ?? "")}
    >
      <TextField
        id="member-email"
        type="email"
        label="Neue E-Mail-Adresse"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
    </ActionDialog>
  );
}

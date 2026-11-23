"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField } from "@/components/ui/field";
import { createSystemkonto } from "@/components/feature/admin-mitglieder/systemkonto-actions";

/** #329: ein Login ohne begleitendes `Member` — für Funktionsmailboxen o.ä.,
 * kein Ersatz für die Einladung eines regulären Vereinsmitglieds. */
export function SystemkontoDialog() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <UserCog />
          Systemkonto anlegen
        </Button>
      }
      title="Systemkonto anlegen"
      description="Legt ein Portal-Login ohne begleitendes Vereinsmitglied an (z. B. eine Funktionsmailbox). Für ein reguläres Mitglied stattdessen die Einladung nutzen."
      submitLabel="Anlegen"
      canSubmit={email.trim().length > 0 && displayName.trim().length > 0}
      action={() => createSystemkonto({ email, displayName })}
      onReset={() => {
        setEmail("");
        setDisplayName("");
      }}
    >
      <div className="flex flex-col gap-4">
        <TextField
          id="systemkonto-email"
          type="email"
          label="E-Mail-Adresse"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          id="systemkonto-name"
          label="Anzeigename"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
    </ActionDialog>
  );
}

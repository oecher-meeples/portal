"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { formatDatePlain } from "@/lib/utils/format";
import { requestOwnEmailChange } from "@/components/feature/mitglied-profil/email-change-actions";

export type OwnEmailChange = {
  newEmail: string;
  requestedAt: string;
  confirmed: boolean;
};

/** E-Mail-Adresse ändern (#614) — nur auf dem eigenen Profil. Eine Adresse
 * pro Person: sie ist Vereinsmitglied- und Login-E-Mail zugleich, eine
 * Änderung läuft deshalb als Änderungsantrag (Bestätigungslink an die neue
 * Adresse + Vorstandsfreigabe, #330). */
export function EmailAddressSection({
  email,
  openChange,
}: {
  email: string | null;
  openChange: OwnEmailChange | null;
}) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const { run, pending, error } = useAction({
    onSuccess: () => setEditing(false),
  });

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>E-Mail-Adresse</CardTitle>
        <CardDescription>
          Mit dieser Adresse meldest du dich an, und an sie gehen alle
          Vereinsmitteilungen.
        </CardDescription>
        {!editing && (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewEmail("");
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
              Ändern
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <p className="text-sm break-all">{email ?? "Keine hinterlegt"}</p>

      {openChange && !editing && (
        <p className="bg-muted rounded-md px-3 py-2 text-sm">
          {openChange.confirmed
            ? `Änderung auf ${openChange.newEmail} vom ${formatDatePlain(openChange.requestedAt)} ist bestätigt und wartet auf Freigabe durch den Vorstand.`
            : `Bestätigungslink an ${openChange.newEmail} gesendet (${formatDatePlain(openChange.requestedAt)}) — bitte den Link in dieser Mail anklicken.`}
        </p>
      )}

      {editing && (
        <div className="flex flex-col gap-4">
          <TextField
            id="email-change-new"
            type="email"
            label="Neue E-Mail-Adresse"
            autoComplete="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
          <p className="text-muted-foreground text-sm">
            Du bekommst einen Bestätigungslink an die neue Adresse. Danach gibt
            der Vorstand die Änderung frei; erst dann gilt die neue Adresse für
            Login und Vereinskontakt, und die bisherige wird ungültig — du
            bekommst dazu eine Mail an die neue Adresse.
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={() => run(() => requestOwnEmailChange(newEmail))}
              disabled={pending || !newEmail.trim()}
            >
              {pending ? "Sende…" : "Bestätigungslink senden"}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

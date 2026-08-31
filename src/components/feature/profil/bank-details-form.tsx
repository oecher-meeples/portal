"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnBankDetails } from "@/components/feature/profil/actions";

/** #330: Änderungen laufen seit dem PendingChange-Umbau nicht mehr sofort —
 * der aktuelle (freigegebene) Stand bleibt unverändert sichtbar, bis der
 * Kassenwart den Antrag freigibt. */
export function BankDetailsForm({
  accountHolder,
  ibanLast4: storedLast4,
  maskedIban,
}: {
  accountHolder: string | null;
  ibanLast4: string | null;
  maskedIban: string;
}) {
  const [iban, setIban] = useState("");
  const [pendingAccountHolder, setPendingAccountHolder] = useState(
    accountHolder ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateOwnBankDetails({
      accountHolder: pendingAccountHolder,
      iban,
    });
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setIban("");
    setMessage(
      "Änderungsantrag eingereicht — wirksam, sobald der Kassenwart ihn freigegeben hat.",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accountHolder">Kontoinhaber</Label>
        <Input
          id="accountHolder"
          value={pendingAccountHolder}
          onChange={(event) => setPendingAccountHolder(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="iban">IBAN</Label>
        <Input
          id="iban"
          value={iban}
          onChange={(event) => setIban(event.target.value)}
          placeholder={
            storedLast4 ? `gespeichert: **** ${storedLast4}` : maskedIban
          }
          autoComplete="off"
          required
        />
        <p className="text-muted-foreground text-sm">
          Gespeichert wird die IBAN verschlüsselt. Angezeigt werden nur die
          letzten vier Stellen — auch dir gegenüber. Eine Änderung braucht die
          Freigabe des Kassenwarts, bevor sie wirksam wird.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving} className="w-fit">
          {isSaving ? "Sende…" : "Änderung beantragen"}
        </Button>
      </div>
    </form>
  );
}

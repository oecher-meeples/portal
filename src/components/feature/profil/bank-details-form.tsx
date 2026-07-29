"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearOwnBankDetails,
  updateOwnBankDetails,
} from "@/components/feature/profil/actions";

export function BankDetailsForm({
  accountHolder: initialAccountHolder,
  ibanLast4: initialIbanLast4,
  maskedIban,
}: {
  accountHolder: string | null;
  ibanLast4: string | null;
  maskedIban: string;
}) {
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder ?? "");
  const [iban, setIban] = useState("");
  const [storedLast4, setStoredLast4] = useState(initialIbanLast4);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateOwnBankDetails({ accountHolder, iban });
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setStoredLast4(result.ibanLast4 ?? null);
    setIban("");
    setMessage("Bankdaten verschlüsselt gespeichert.");
  }

  async function handleClear() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    await clearOwnBankDetails();
    setIsSaving(false);
    setStoredLast4(null);
    setAccountHolder("");
    setIban("");
    setMessage("Bankdaten gelöscht.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accountHolder">Kontoinhaber</Label>
        <Input
          id="accountHolder"
          value={accountHolder}
          onChange={(event) => setAccountHolder(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="iban">IBAN</Label>
        <Input
          id="iban"
          value={iban}
          onChange={(event) => setIban(event.target.value)}
          placeholder={storedLast4 ? `gespeichert: **** ${storedLast4}` : maskedIban}
          autoComplete="off"
          required
        />
        <p className="text-muted-foreground text-sm">
          Gespeichert wird die IBAN verschlüsselt. Angezeigt werden nur die
          letzten vier Stellen — auch dir gegenüber. Zum Ändern die vollständige
          IBAN neu eingeben.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving} className="w-fit">
          {isSaving ? "Speichere…" : "Bankdaten speichern"}
        </Button>
        {storedLast4 && (
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={handleClear}
          >
            Bankdaten löschen
          </Button>
        )}
      </div>
    </form>
  );
}

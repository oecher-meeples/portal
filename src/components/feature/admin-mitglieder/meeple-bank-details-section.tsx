"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { revealMemberIban } from "@/components/feature/admin-mitglieder/actions";

/**
 * Bankdaten im Mitglieder-Editdialog: ohne `bank:read` immer maskiert und
 * readonly, mit dem Recht auf Klick entschlüsselbar (protokolliert wie im
 * dedizierten Bankdaten-Bereich, siehe revealMemberIban).
 */
export function MeepleBankDetailsSection({
  meepleId,
  accountHolder,
  maskedIban,
  hasIban,
  canReadBankData,
}: {
  meepleId: string;
  accountHolder: string | null;
  maskedIban: string;
  hasIban: boolean;
  canReadBankData: boolean;
}) {
  const [revealedIban, setRevealedIban] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setPending(true);
    setError(null);
    const result = await revealMemberIban(meepleId);
    setPending(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setRevealedIban(result.iban);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Bankdaten</span>
      <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <div className="flex flex-col">
          <span>{accountHolder ?? "—"}</span>
          <span className="text-muted-foreground font-mono">
            {revealedIban ?? maskedIban}
          </span>
        </div>
        {canReadBankData && hasIban && !revealedIban && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleReveal}
          >
            {pending ? "Decke auf…" : "IBAN aufdecken"}
          </Button>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

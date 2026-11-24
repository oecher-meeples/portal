"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import {
  countMissingInvites,
  inviteAllMissing,
  type BulkInviteResult,
} from "@/components/feature/admin-mitglieder/invite-actions";
import { BulkInviteSummary } from "@/components/feature/admin-mitglieder/bulk-invite-summary";

/**
 * „Alle Fehlenden einladen" (#622) unter der Vereinsmitglieder-Tabelle —
 * eigene Datei, weil `vereinsmitglieder-table.tsx` sonst über die
 * Zeilengrenze wächst. Die Anzahl wird beim Öffnen frisch geladen, gesendet
 * wird erst nach Bestätigung; die Kandidaten bestimmt der Server neu.
 */
export function InviteAllMissingDialog() {
  const [count, setCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<BulkInviteResult | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <ActionDialog
        trigger={
          <Button variant="outline" className="w-fit gap-1.5">
            <Send className="size-4" />
            Alle Fehlenden einladen
          </Button>
        }
        title="Alle Fehlenden einladen"
        description="Mitglieder mit E-Mail, ohne Portal-Login, nicht gekündigt und ohne offene oder widerrufene Einladung bekommen je eine Einladung per Mail."
        onOpen={async () => {
          setCount(null);
          setSummary(null);
          setCount((await countMissingInvites()).count);
        }}
        canSubmit={count !== null && count > 0}
        submitLabel={count ? `${count} einladen` : "Einladen"}
        pendingLabel="Lade ein…"
        action={async () => {
          setSummary(await inviteAllMissing());
        }}
      >
        <p className="text-sm">
          {count === null
            ? "Zähle …"
            : count === 0
              ? "Niemand einzuladen."
              : `${count} Mitglied(er) werden eingeladen.`}
        </p>
      </ActionDialog>

      {summary && <BulkInviteSummary summary={summary} />}
    </div>
  );
}

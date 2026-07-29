"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resignOwnMembership } from "@/components/feature/profil/actions";

export function ResignMembershipPanel({
  resignedAt,
  membershipEndsAt,
}: {
  resignedAt: string | null;
  membershipEndsAt: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(resignedAt !== null);
  const [endsAt, setEndsAt] = useState(membershipEndsAt);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleResign() {
    setIsSaving(true);
    setError(null);

    const result = await resignOwnMembership();
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setConfirming(false);
    setEndsAt(
      result.membershipEndsAt
        ? new Date(result.membershipEndsAt).toISOString()
        : null,
    );
  }

  if (done) {
    return (
      <p className="bg-primary/10 rounded-md p-3 text-sm">
        Deine Kündigung ist vermerkt. Die Mitgliedschaft läuft unverändert weiter
        bis zum Jahreswechsel
        {endsAt
          ? ` (${new Intl.DateTimeFormat("de-DE").format(new Date(endsAt))})`
          : ""}
        . Bis dahin kannst du weiter ausleihen. Danach bleibt dir nur noch die
        Abwicklung: Profil, eigene Bestände, Rückgabe und Weitergabe.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Eine Kündigung wird sofort vermerkt, wirkt aber erst zum Jahreswechsel.
        Bis dahin bleibt alles unverändert.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={isSaving}
            onClick={handleResign}
          >
            {isSaving ? "Vermerke…" : "Kündigung wirklich vermerken"}
          </Button>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 w-fit"
          onClick={() => setConfirming(true)}
        >
          Mitgliedschaft kündigen
        </Button>
      )}
    </div>
  );
}

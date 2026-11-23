"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { resignOwnMembership } from "@/lib/members/own-profile-actions";
import { formatDatePlain } from "@/lib/utils/format";
import { SETTLEMENT_HANDOVER_HINT } from "@/lib/members/membership-state";

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
  const { run, pending: isSaving, error } = useAction();

  async function handleResign() {
    await run(async () => {
      const result = await resignOwnMembership();
      if ("error" in result) return result;
      setDone(true);
      setConfirming(false);
      setEndsAt(
        result.membershipEndsAt
          ? new Date(result.membershipEndsAt).toISOString()
          : null,
      );
      return result;
    });
  }

  if (done) {
    return (
      <p className="bg-primary/10 rounded-md p-3 text-sm">
        Deine Kündigung ist vermerkt. Die Mitgliedschaft läuft unverändert
        weiter bis zum Jahreswechsel
        {endsAt ? ` (${formatDatePlain(endsAt)})` : ""}. Bis dahin kannst du
        weiter ausleihen. Danach siehst du nur noch dein Profil und deine
        eigenen Bestände. {SETTLEMENT_HANDOVER_HINT}
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

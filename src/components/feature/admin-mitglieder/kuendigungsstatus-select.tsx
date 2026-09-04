"use client";

import { useState } from "react";
import { computeMembershipEndsAt } from "@/lib/members/membership-state";
import type { MembershipState } from "@/lib/members/membership-state";
import { useAction } from "@/components/ui/use-action";
import {
  recordResignation,
  revokeResignation,
} from "@/components/feature/admin-mitglieder/actions";

type EditableState = "aktiv" | "gekuendigt";

const STATE_LABELS: Record<MembershipState, string> = {
  unregistriert: "Aktiv",
  registriert: "Aktiv",
  gekuendigt: "Gekündigt",
  ausgetreten: "Ausgetreten",
  anonymisiert: "Anonymisiert",
};

/**
 * "Ausgetreten" und "anonymisiert" ergeben sich aus Datum bzw. Anonymisierung
 * und sind hier nicht anwählbar — nur der Wechsel zwischen aktiv und
 * gekündigt ist eine direkte Admin-Entscheidung.
 */
export function KuendigungsstatusSelect({
  meepleId,
  membershipState,
}: {
  meepleId: string;
  membershipState: MembershipState;
}) {
  const [value, setValue] = useState<EditableState>(
    membershipState === "gekuendigt" ? "gekuendigt" : "aktiv",
  );
  const { run, pending, error } = useAction();

  if (membershipState === "ausgetreten" || membershipState === "anonymisiert") {
    return (
      <span className="text-muted-foreground text-sm">
        {STATE_LABELS[membershipState]}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as EditableState;
          setValue(next);
          run(() =>
            next === "gekuendigt"
              ? recordResignation(meepleId, computeMembershipEndsAt())
              : revokeResignation(meepleId),
          );
        }}
        className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-60"
      >
        <option value="aktiv">{STATE_LABELS.registriert}</option>
        <option value="gekuendigt">{STATE_LABELS.gekuendigt}</option>
      </select>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

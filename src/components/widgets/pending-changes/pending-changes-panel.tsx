"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextAreaField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { formatDatePlain } from "@/lib/utils/format";
import {
  approvePendingChange,
  rejectPendingChange,
} from "@/lib/members/pending-change-actions";

export type PendingChangeRow = {
  id: string;
  memberDisplayName: string;
  memberNumber: number;
  /** IBAN: maskiert (`**** 1234`) — die Klartext-IBAN geht nie an den Client,
   * bevor sie freigegeben ist. MEMBER_EMAIL: die neu beantragte Adresse. */
  displayValue: string;
  requestedAt: string;
  /** Nur MEMBER_EMAIL — muss `true` sein, bevor freigegeben werden kann. */
  confirmed: boolean;
};

function RejectDialog({ id }: { id: string }) {
  const [reason, setReason] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <X className="size-3.5" />
          Ablehnen
        </Button>
      }
      title="Änderungsantrag ablehnen"
      description="Das Mitglied erhält eine Mail mit der Begründung an die aktuell hinterlegte Adresse."
      submitLabel="Ablehnen"
      submitVariant="destructive"
      action={() => rejectPendingChange(id, reason)}
      onReset={() => setReason("")}
    >
      <TextAreaField
        id="reject-reason"
        label="Begründung (optional)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </ActionDialog>
  );
}

/** Von /admin/bank (kind: IBAN) und /admin/mitglieder (kind: MEMBER_EMAIL)
 * genutzt — deshalb `components/widgets/`, nicht in einem der beiden Features. */
export function PendingChangesPanel({
  title,
  changes,
}: {
  title: string;
  changes: PendingChangeRow[];
}) {
  const { run, pending, error } = useAction();

  if (changes.length === 0) return null;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">{title}</h2>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <ul className="flex flex-col divide-y text-sm">
        {changes.map((change) => (
          <li
            key={change.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium">
                #{change.memberNumber} {change.memberDisplayName}
              </p>
              <p className="text-muted-foreground">
                neu: {change.displayValue} · beantragt{" "}
                {formatDatePlain(change.requestedAt)}
                {!change.confirmed &&
                  " · wartet noch auf Bestätigung durch das Mitglied"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending || !change.confirmed}
                onClick={() => run(() => approvePendingChange(change.id))}
              >
                <Check className="size-3.5" />
                Freigeben
              </Button>
              <RejectDialog id={change.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

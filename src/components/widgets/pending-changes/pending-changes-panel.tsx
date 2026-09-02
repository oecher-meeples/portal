"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/field";
import {
  PressHoldReveal,
  type RevealResult,
} from "@/components/ui/press-hold-reveal";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils/cn";
import { formatDatePlain } from "@/lib/utils/format";
import {
  approvePendingChange,
  checkOpenInviteBeforeApproval,
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
 * genutzt — deshalb `components/widgets/`, nicht in einem der beiden Features.
 * `isEmailChangePanel` gilt für die ganze Instanz (beide Aufrufer zeigen
 * jeweils nur eine Art von Änderung), nicht pro Zeile.
 *
 * `revealIban` (nur von /admin/bank gesetzt, #356): Kassenwart soll die
 * beantragte IBAN vor der Freigabe sehen können, statt nur die maskierte
 * `displayValue` — Klartext-IBAN geht nie ungefragt an den Client. */
export function PendingChangesPanel({
  title,
  changes,
  isEmailChangePanel = false,
  revealIban,
}: {
  title: string;
  changes: PendingChangeRow[];
  isEmailChangePanel?: boolean;
  revealIban?: (changeId: string) => Promise<RevealResult>;
}) {
  const { run, pending, error } = useAction();
  const [inviteConflictId, setInviteConflictId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  // Pro Antrag ein eigener Aufdeck-Zustand — der aufgedeckte Wert löst die
  // maskierte `displayValue` direkt ab (siehe `press-hold-reveal.tsx`).
  const [revealedByChangeId, setRevealedByChangeId] = useState<
    Record<string, string | null>
  >({});

  if (changes.length === 0) return null;

  async function handleApproveClick(changeId: string) {
    if (!isEmailChangePanel) {
      run(() => approvePendingChange(changeId));
      return;
    }
    setCheckingId(changeId);
    const hasOpenInvite = await checkOpenInviteBeforeApproval(changeId);
    setCheckingId(null);
    if (hasOpenInvite) {
      setInviteConflictId(changeId);
      return;
    }
    run(() => approvePendingChange(changeId));
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">{title}</h2>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {revealError && <p className="text-destructive text-sm">{revealError}</p>}
      <ul className="flex flex-col divide-y text-sm">
        {changes.map((change) => (
          <li
            key={change.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              {/* Live-Review F12: eigene Zeile über Mitgliedsnummer/Name statt
               * mitten in der "neu: …"-Zeile. */}
              <p className="text-muted-foreground text-xs">
                beantragt {formatDatePlain(change.requestedAt)}
              </p>
              <p className="font-medium">
                #{change.memberNumber} {change.memberDisplayName}
              </p>
              <p className="text-muted-foreground flex flex-wrap items-center gap-2">
                <span>
                  neu:{" "}
                  {/* Live-Review F11: feste Breite wie in
                   * `bankverbindung-section.tsx`, nur für IBAN-Anträge (dort
                   * `revealIban` gesetzt) — E-Mail-Anträge behalten Fließtext. */}
                  <span
                    className={cn(
                      "font-mono",
                      revealIban && "inline-block w-[22ch]",
                    )}
                  >
                    {revealedByChangeId[change.id] ?? change.displayValue}
                  </span>
                  {!change.confirmed &&
                    " · wartet noch auf Bestätigung durch das Mitglied"}
                </span>
                {revealIban && (
                  <span className="inline-flex items-center gap-2">
                    <PressHoldReveal
                      reveal={() => revealIban(change.id)}
                      onError={setRevealError}
                      onValueChange={(value) =>
                        setRevealedByChangeId((prev) => ({
                          ...prev,
                          [change.id]: value,
                        }))
                      }
                    />
                    <CopyButton
                      value={() => revealIban(change.id)}
                      onError={setRevealError}
                      label="Kopieren"
                      icon={Copy}
                    />
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={
                  pending || !change.confirmed || checkingId === change.id
                }
                onClick={() => handleApproveClick(change.id)}
              >
                <Check className="size-3.5" />
                {checkingId === change.id ? "Prüfe…" : "Freigeben"}
              </Button>
              <RejectDialog id={change.id} />
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={inviteConflictId !== null}
        onOpenChange={(open) => !open && setInviteConflictId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Es existiert eine offene Einladung</DialogTitle>
            <DialogDescription>
              Für dieses Mitglied liegt noch eine offene Einladung an der alten
              E-Mail-Adresse vor. Diese widerrufen und mit der neuen Adresse neu
              erstellen? Ohne Bestätigung bleibt die alte Einladung unverändert
              bestehen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={pending}
              onClick={async () => {
                if (inviteConflictId) {
                  await run(() => approvePendingChange(inviteConflictId));
                }
                setInviteConflictId(null);
              }}
            >
              Nur freigeben, Einladung unverändert lassen
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                if (inviteConflictId) {
                  await run(() =>
                    approvePendingChange(inviteConflictId, {
                      revokeAndReissueInvite: true,
                    }),
                  );
                }
                setInviteConflictId(null);
              }}
            >
              Freigeben, Einladung widerrufen und neu erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

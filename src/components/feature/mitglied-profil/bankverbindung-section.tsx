"use client";

import { useState } from "react";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { CopyButton } from "@/components/ui/copy-button";
import {
  PressHoldReveal,
  type RevealResult,
} from "@/components/ui/press-hold-reveal";
import { useAction } from "@/components/ui/use-action";
import {
  PendingChangesPanel,
  type PendingChangeRow,
} from "@/components/widgets/pending-changes/pending-changes-panel";
import {
  revealMemberIban,
  revealPendingMemberIban,
  requestMemberIbanChange,
  updateMemberIban,
} from "@/components/feature/mitglied-profil/bankverbindung-actions";
import { OwnPendingChangeNotice } from "@/components/feature/mitglied-profil/own-pending-change-notice";

/** Bankverbindungs-Bereich der Profilseite (#381) — sichtbar (maskiert) nur
 * für `bank:read`/`members:manage`/den Meeple selbst; demaskieren, kopieren
 * und direkt bearbeiten kann nur der Kassenwart (`bank:read`). Der Aufrufer
 * (`mitglied-profil-view.tsx`) blendet den ganzen Bereich für Spielewart und
 * MiniMeeple bereits vorher aus. */
export function BankverbindungSection({
  memberId,
  meepleId,
  accountHolder,
  maskedIban,
  hasIban,
  canEdit,
  canRequestChange = false,
  ownPendingChange = null,
  openChanges,
}: {
  memberId: string;
  meepleId: string | null;
  accountHolder: string | null;
  maskedIban: string;
  hasIban: boolean;
  /** `bank:read` — Demaskieren/Kopieren/sofortige Bearbeitung. */
  canEdit: boolean;
  /** Meeple-selbst/Erziehungsberechtigte:r — stellt statt direkter
   * Bearbeitung einen Änderungsantrag (#381). */
  canRequestChange?: boolean;
  /** Eigener noch offener Antrag der aktuellen Session, unabhängig von
   * `canEdit` — für den "wartet auf Freigabe"-Hinweis. */
  ownPendingChange?: { requestedAt: string } | null;
  openChanges: PendingChangeRow[];
}) {
  const [editing, setEditing] = useState(false);
  const [holder, setHolder] = useState(accountHolder ?? "");
  const [iban, setIban] = useState("");
  const [revealedIban, setRevealedIban] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const { run, pending, error } = useAction({
    onSuccess: () => setEditing(false),
  });

  const canEditUi = canEdit || canRequestChange;

  async function reveal(): Promise<RevealResult> {
    if (!meepleId) return { error: "Für dieses Mitglied kein Portal-Login." };
    const result = await revealMemberIban(meepleId);
    return "error" in result
      ? result
      : { success: true as const, value: result.iban };
  }

  async function handleSave() {
    if (canEdit) {
      await run(() =>
        updateMemberIban(memberId, { accountHolder: holder, iban }),
      );
      return;
    }
    await run(() =>
      requestMemberIbanChange(memberId, { accountHolder: holder, iban }),
    );
  }

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-bold">Bankverbindung</h2>
        {canEditUi && !editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHolder(accountHolder ?? "");
              setIban("");
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Bearbeiten
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <TextField
            id="bankverbindung-holder"
            label="Kontoinhaber"
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
          />
          <TextField
            id="bankverbindung-iban"
            label="IBAN"
            value={iban}
            onChange={(event) => setIban(event.target.value)}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending}>
              {pending
                ? "Speichere…"
                : canEdit
                  ? "Speichern"
                  : "Änderung beantragen"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Kontoinhaber</dt>
            <dd>{accountHolder ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">IBAN</dt>
            <dd className="flex flex-wrap items-center gap-2 font-mono">
              {/* Feste Breite in IBAN-Länge: die Maskierung wird beim
               * Aufdecken direkt an derselben Stelle durch den Klartext
               * abgelöst, statt dass ein zusätzliches Element danach
               * erscheint und Button/Kopieren verschiebt. */}
              <span className="inline-block w-[22ch]">
                {revealedIban ?? maskedIban}
              </span>
              {canEdit && hasIban && meepleId && (
                <>
                  <PressHoldReveal
                    reveal={reveal}
                    onError={setRevealError}
                    onValueChange={setRevealedIban}
                  />
                  <CopyButton
                    value={reveal}
                    onError={setRevealError}
                    label="Kopieren"
                    icon={Copy}
                  />
                </>
              )}
            </dd>
          </div>
        </dl>
      )}
      {revealError && <p className="text-destructive text-sm">{revealError}</p>}

      {!canEdit && ownPendingChange && (
        <OwnPendingChangeNotice requestedAt={ownPendingChange.requestedAt} />
      )}

      {canEdit && openChanges.length > 0 && (
        <PendingChangesPanel
          titleSingular="Offener IBAN-Änderungsantrag"
          titlePlural="Offene IBAN-Änderungsanträge"
          changes={openChanges}
          revealIban={async (changeId) => {
            const result = await revealPendingMemberIban(changeId);
            return "error" in result
              ? result
              : { success: true as const, value: result.iban };
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import {
  MeepleRoleSelect,
  type RoleOption,
} from "@/components/feature/admin-mitglieder/meeple-role-select";
import { KuendigungsstatusSelect } from "@/components/feature/admin-mitglieder/kuendigungsstatus-select";
import { MeepleBankDetailsSection } from "@/components/feature/admin-mitglieder/meeple-bank-details-section";
import { LoginRateLimitSection } from "@/components/feature/admin-mitglieder/login-rate-limit-section";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import {
  renameMeeple,
  setMemberNumber,
} from "@/components/feature/admin-mitglieder/actions";
import type { MeepleRow } from "@/components/feature/admin-mitglieder/meeple-row";

/**
 * The single edit surface for a Meeple's admin-managed fields. Each field
 * saves itself independently on blur/change (no combined submit) — the same
 * "commit as you go" pattern as MeepleRoleSelect, just gathered behind one
 * pencil-icon trigger instead of scattering inline editors across the table.
 */
export function MeepleEditDialog({
  meeple,
  roles,
  canReadBankData,
  canManageAdminAccess,
}: {
  meeple: MeepleRow;
  roles: RoleOption[];
  canReadBankData: boolean;
  canManageAdminAccess: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [memberNumber, setMemberNumberValue] = useState(
    String(meeple.memberNumber),
  );
  const [displayName, setDisplayName] = useState(meeple.displayName);
  const {
    run: runNumber,
    error: numberError,
    setError: setNumberError,
  } = useAction();
  const {
    run: runName,
    error: nameError,
    setError: setNameError,
  } = useAction();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMemberNumberValue(String(meeple.memberNumber));
      setDisplayName(meeple.displayName);
      setNumberError(null);
      setNameError(null);
    }
  }

  function commitMemberNumber() {
    const parsed = Number(memberNumber);
    if (parsed === meeple.memberNumber) return;
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setNumberError("Die Mitgliedsnummer muss eine positive ganze Zahl sein.");
      setMemberNumberValue(String(meeple.memberNumber));
      return;
    }
    runNumber(() => setMemberNumber(meeple.id, parsed)).then((succeeded) => {
      if (!succeeded) setMemberNumberValue(String(meeple.memberNumber));
    });
  }

  function commitDisplayName() {
    const trimmed = displayName.trim();
    if (trimmed === meeple.displayName) return;
    if (!trimmed) {
      setNameError("Bitte einen Anzeigenamen angeben.");
      setDisplayName(meeple.displayName);
      return;
    }
    runName(() => renameMeeple(meeple.id, trimmed)).then((succeeded) => {
      if (!succeeded) setDisplayName(meeple.displayName);
    });
  }

  const canAnonymise =
    meeple.membershipState === "ausgetreten" &&
    meeple.openGames === 0 &&
    meeple.openUnits === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mitglied bearbeiten"
          >
            <Pencil />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>„{meeple.displayName}“ bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id={`edit-number-${meeple.id}`}
              label="Mitgliedsnummer"
              type="number"
              min={1}
              step={1}
              value={memberNumber}
              onChange={(event) => setMemberNumberValue(event.target.value)}
              onBlur={commitMemberNumber}
              hint={numberError}
            />
            <TextField
              id={`edit-name-${meeple.id}`}
              label="Anzeigename"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onBlur={commitDisplayName}
              hint={nameError}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Rolle</span>
            {meeple.hasAccount ? (
              <MeepleRoleSelect
                meepleId={meeple.id}
                assignments={meeple.roleAssignments}
                roles={roles}
                canManageAdminAccess={canManageAdminAccess}
              />
            ) : (
              <span className="text-muted-foreground text-sm">Kein Konto</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Kündigungsstatus</span>
            <KuendigungsstatusSelect
              meepleId={meeple.id}
              membershipState={meeple.membershipState}
            />
          </div>

          <MeepleBankDetailsSection
            meepleId={meeple.id}
            accountHolder={meeple.accountHolder}
            maskedIban={meeple.maskedIban}
            hasIban={meeple.hasIban}
            canReadBankData={canReadBankData}
          />

          <LoginRateLimitSection meepleId={meeple.id} />

          {canAnonymise && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-sm font-medium">Datenschutz</span>
              <AnonymiseMeepleDialog
                meepleId={meeple.id}
                displayName={meeple.displayName}
              />
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

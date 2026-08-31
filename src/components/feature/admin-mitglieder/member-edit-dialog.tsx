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
import { ActionButton } from "@/components/ui/action-button";
import { useAction } from "@/components/ui/use-action";
import {
  MemberPersonendatenFields,
  personendatenFormToInput,
  type MemberPersonendatenForm,
} from "@/components/feature/admin-mitglieder/member-personendaten-fields";
import {
  sendSelbstauskunft,
  updateMember,
} from "@/components/feature/admin-mitglieder/member-actions";
import { GuardianManagementSection } from "@/components/feature/admin-mitglieder/guardian-management-section";
import type { VereinsmitgliedRow } from "@/components/feature/admin-mitglieder/vereinsmitglied-row";

function toForm(member: VereinsmitgliedRow): MemberPersonendatenForm {
  return {
    email: member.email ?? "",
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    birthDate: member.birthDate?.slice(0, 10) ?? "",
    street: member.street ?? "",
    postalCode: member.postalCode ?? "",
    city: member.city ?? "",
    phone: member.phone ?? "",
  };
}

/** Edit-Dialog für eine Vereinsmitglied-Zeile (#343) — volle
 * Personendaten-Bearbeitung plus "Selbstauskunft senden" (hierher verschoben
 * aus der Meeple-Tabelle, siehe `meeple-edit-dialog.tsx`). IBAN/Bankdaten und
 * Kündigungsstatus bleiben eigene Dialoge in `vereinsmitglieder-table.tsx`. */
export function MemberEditDialog({ member }: { member: VereinsmitgliedRow }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MemberPersonendatenForm>(() =>
    toForm(member),
  );
  const { run, pending, error } = useAction();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setForm(toForm(member));
  }

  async function handleSave() {
    const succeeded = await run(() =>
      updateMember(member.id, personendatenFormToInput(form)),
    );
    if (succeeded) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Vereinsmitglied „${member.displayName}“ bearbeiten`}
          >
            <Pencil />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>„{member.displayName}“ bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <MemberPersonendatenFields
            idPrefix={`edit-member-${member.id}`}
            form={form}
            onChange={(key, value) =>
              setForm((prev) => ({ ...prev, [key]: value }))
            }
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Speichere…" : "Speichern"}
          </Button>

          {member.meepleId && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-sm font-medium">Datenschutz</span>
              <ActionButton
                action={() => sendSelbstauskunft(member.meepleId!)}
                refresh={false}
                variant="outline"
                size="sm"
                confirm={`Selbstauskunft an ${member.email ?? "dieses Mitglied"} senden?`}
                pendingLabel="Sende…"
              >
                Selbstauskunft senden
              </ActionButton>
            </div>
          )}

          {open && <GuardianManagementSection childMemberId={member.id} />}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

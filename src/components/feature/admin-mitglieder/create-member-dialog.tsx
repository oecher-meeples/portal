"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  EMPTY_MEMBER_PERSONENDATEN_FORM,
  MemberPersonendatenFields,
  personendatenFormToInput,
} from "@/components/feature/admin-mitglieder/member-personendaten-fields";
import { createMember } from "@/components/feature/admin-mitglieder/member-actions";

/** "Vereinsmitglied erstellen" (#342) — bekommt eine Mitgliedsnummer nach
 * demselben Schema wie Bestandsmitglieder (höchste + 1), steht danach für
 * eine Einladung zur Verfügung. */
export function CreateMemberDialog() {
  const [form, setForm] = useState(EMPTY_MEMBER_PERSONENDATEN_FORM);

  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <UserPlus />
          Vereinsmitglied erstellen
        </Button>
      }
      title="Vereinsmitglied erstellen"
      description="Legt ein neues Vereinsmitglied an — bereit für eine Einladung."
      submitLabel="Anlegen"
      canSubmit={form.email.trim().length > 0}
      action={() => createMember(personendatenFormToInput(form))}
      onReset={() => setForm(EMPTY_MEMBER_PERSONENDATEN_FORM)}
    >
      <MemberPersonendatenFields
        idPrefix="new-member"
        form={form}
        onChange={(key, value) =>
          setForm((prev) => ({ ...prev, [key]: value }))
        }
      />
    </ActionDialog>
  );
}

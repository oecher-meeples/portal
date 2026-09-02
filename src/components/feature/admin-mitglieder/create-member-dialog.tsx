"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  EMPTY_MEMBER_PERSONENDATEN_FORM,
  MemberPersonendatenFields,
  personendatenFormCanSubmit,
  personendatenFormToInput,
  todayAsDateInputValue,
} from "@/components/feature/admin-mitglieder/member-personendaten-fields";
import { createMember } from "@/components/feature/admin-mitglieder/member-actions";

/** "Vereinsmitglied erstellen" (#342) — bekommt eine Mitgliedsnummer nach
 * demselben Schema wie Bestandsmitglieder (höchste + 1), steht danach für
 * eine Einladung zur Verfügung. */
function emptyFormWithTodayAsJoinedAt() {
  return {
    ...EMPTY_MEMBER_PERSONENDATEN_FORM,
    joinedAt: todayAsDateInputValue(),
  };
}

export function CreateMemberDialog({ isAdmin }: { isAdmin: boolean }) {
  const [form, setForm] = useState(emptyFormWithTodayAsJoinedAt);

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
      canSubmit={personendatenFormCanSubmit(form)}
      action={() => createMember(personendatenFormToInput(form))}
      onReset={() => setForm(emptyFormWithTodayAsJoinedAt())}
    >
      <MemberPersonendatenFields
        idPrefix="new-member"
        form={form}
        onChange={(key, value) =>
          setForm((prev) => ({ ...prev, [key]: value }))
        }
        isAdmin={isAdmin}
      />
    </ActionDialog>
  );
}

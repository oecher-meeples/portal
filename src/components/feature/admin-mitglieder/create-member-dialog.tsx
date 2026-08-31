"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createMember } from "@/components/feature/admin-mitglieder/member-actions";

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  street: "",
  postalCode: "",
  city: "",
  phone: "",
};

/** "Vereinsmitglied erstellen" (#342) — bekommt eine Mitgliedsnummer nach
 * demselben Schema wie Bestandsmitglieder (höchste + 1), steht danach für
 * eine Einladung zur Verfügung. */
export function CreateMemberDialog() {
  const [form, setForm] = useState(EMPTY_FORM);

  function patch<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
      action={() =>
        createMember({
          email: form.email,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          birthDate: form.birthDate ? new Date(form.birthDate) : null,
          street: form.street || null,
          postalCode: form.postalCode || null,
          city: form.city || null,
          phone: form.phone || null,
        })
      }
      onReset={() => setForm(EMPTY_FORM)}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="new-member-firstname"
          label="Vorname"
          value={form.firstName}
          onChange={(event) => patch("firstName", event.target.value)}
        />
        <TextField
          id="new-member-lastname"
          label="Nachname"
          value={form.lastName}
          onChange={(event) => patch("lastName", event.target.value)}
        />
        <TextField
          id="new-member-email"
          label="E-Mail"
          type="email"
          value={form.email}
          onChange={(event) => patch("email", event.target.value)}
          fieldClassName="col-span-2"
          required
        />
        <TextField
          id="new-member-birthdate"
          label="Geburtsdatum"
          type="date"
          value={form.birthDate}
          onChange={(event) => patch("birthDate", event.target.value)}
        />
        <TextField
          id="new-member-phone"
          label="Telefon"
          type="tel"
          value={form.phone}
          onChange={(event) => patch("phone", event.target.value)}
        />
        <TextField
          id="new-member-street"
          label="Straße"
          value={form.street}
          onChange={(event) => patch("street", event.target.value)}
          fieldClassName="col-span-2"
        />
        <TextField
          id="new-member-postalcode"
          label="PLZ"
          value={form.postalCode}
          onChange={(event) => patch("postalCode", event.target.value)}
        />
        <TextField
          id="new-member-city"
          label="Ort"
          value={form.city}
          onChange={(event) => patch("city", event.target.value)}
        />
      </div>
    </ActionDialog>
  );
}

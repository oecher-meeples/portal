"use client";

import { TextField } from "@/components/ui/field";

export type MemberPersonendatenForm = {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
};

export const EMPTY_MEMBER_PERSONENDATEN_FORM: MemberPersonendatenForm = {
  email: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  street: "",
  postalCode: "",
  city: "",
  phone: "",
};

/** Shared Personendaten-Felder von `CreateMemberDialog` (#342) und
 * `MemberEditDialog` (#343) — Vorname/Nachname/E-Mail/Geburtsdatum/Telefon/
 * Adresse. IBAN/Bankdaten und Kündigungsstatus haben eigene Dialoge/Flows. */
export function MemberPersonendatenFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: MemberPersonendatenForm;
  onChange: <K extends keyof MemberPersonendatenForm>(
    key: K,
    value: MemberPersonendatenForm[K],
  ) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        id={`${idPrefix}-firstname`}
        label="Vorname"
        value={form.firstName}
        onChange={(event) => onChange("firstName", event.target.value)}
      />
      <TextField
        id={`${idPrefix}-lastname`}
        label="Nachname"
        value={form.lastName}
        onChange={(event) => onChange("lastName", event.target.value)}
      />
      <TextField
        id={`${idPrefix}-email`}
        label="E-Mail"
        type="email"
        value={form.email}
        onChange={(event) => onChange("email", event.target.value)}
        fieldClassName="col-span-2"
        required
      />
      <TextField
        id={`${idPrefix}-birthdate`}
        label="Geburtsdatum"
        type="date"
        value={form.birthDate}
        onChange={(event) => onChange("birthDate", event.target.value)}
      />
      <TextField
        id={`${idPrefix}-phone`}
        label="Telefon"
        type="tel"
        value={form.phone}
        onChange={(event) => onChange("phone", event.target.value)}
      />
      <TextField
        id={`${idPrefix}-street`}
        label="Straße"
        value={form.street}
        onChange={(event) => onChange("street", event.target.value)}
        fieldClassName="col-span-2"
      />
      <TextField
        id={`${idPrefix}-postalcode`}
        label="PLZ"
        value={form.postalCode}
        onChange={(event) => onChange("postalCode", event.target.value)}
      />
      <TextField
        id={`${idPrefix}-city`}
        label="Ort"
        value={form.city}
        onChange={(event) => onChange("city", event.target.value)}
      />
    </div>
  );
}

export function personendatenFormToInput(form: MemberPersonendatenForm) {
  return {
    email: form.email,
    firstName: form.firstName || null,
    lastName: form.lastName || null,
    birthDate: form.birthDate ? new Date(form.birthDate) : null,
    street: form.street || null,
    postalCode: form.postalCode || null,
    city: form.city || null,
    phone: form.phone || null,
  };
}

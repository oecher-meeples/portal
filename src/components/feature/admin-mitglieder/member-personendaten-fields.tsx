"use client";

import { Wand2 } from "lucide-react";
import { TextField } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { birthDateValidator } from "@/components/ui/constraints";
import { Button } from "@/components/ui/button";
import {
  CONTRIBUTION_CATEGORY_LABELS,
  ageInYears,
  determineContribution,
} from "@/lib/members/contribution";

/** Demo-Adresse für den Dev-Only-Button neben "Ort" — beliebiger Aachener
 * Beispielort, keine echte Anschrift. */
const DEMO_ADDRESS = {
  street: "Königstraße 1",
  postalCode: "52062",
  city: "Aachen",
};

export type MemberPersonendatenForm = {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  /** Vereinsbeitritt (Live-Review F1), yyyy-mm-dd — getrennt vom
   * Portal-Konto-Anlagedatum (`Meeple.joinedAt`). */
  joinedAt: string;
};

/** Prefill für `CreateMemberDialog` ist immer "heute" — Feld ist trotzdem
 * editierbar, für rückwirkend erfasste Neuanlagen. */
export function todayAsDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export const EMPTY_MEMBER_PERSONENDATEN_FORM: MemberPersonendatenForm = {
  email: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  street: "",
  postalCode: "",
  city: "",
  phone: "",
  joinedAt: "",
};

/** Beitrags-Alterskategorie aus dem Geburtsdatum-Feld — wiederverwendet
 * `determineContribution()` statt eigener Altersgrenzen-Logik. Ohne
 * Geburtsdatum `null` (nicht geraten), macht `emailRequired` unten also
 * sicherheitshalber Pflicht. */
function formContributionCategory(birthDate: string) {
  if (!birthDate) return null;
  return determineContribution({
    birthDate: new Date(birthDate),
    selbstgewaehlterBeitrag: null,
  }).category;
}

/** MiniMeeple/JungMeeple (< 18) dürfen ohne eigene E-Mail-Adresse angelegt
 * werden — ein:e Erziehungsberechtigte:r handelt für sie. Adresse bleibt
 * davon unberührt immer Pflicht (Nutzerentscheidung). */
export function emailRequiredFor(birthDate: string): boolean {
  const category = formContributionCategory(birthDate);
  return category !== "mini" && category !== "jung";
}

/** Ob das Formular speicherbereit ist — spiegelt die serverseitige Prüfung
 * in `create-member.ts`/`update-member.ts` fürs sofortige UI-Feedback
 * (Button-`disabled`), ersetzt sie aber nicht: der Server validiert erneut. */
export function personendatenFormCanSubmit(
  form: MemberPersonendatenForm,
): boolean {
  const hasAddress =
    form.street.trim().length > 0 &&
    form.postalCode.trim().length > 0 &&
    form.city.trim().length > 0;
  const hasEmailIfRequired =
    !emailRequiredFor(form.birthDate) || form.email.trim().length > 0;
  return hasAddress && hasEmailIfRequired;
}

/** Shared Personendaten-Felder von `CreateMemberDialog` (#342) und
 * `MemberEditDialog` (#343) — Vorname/Nachname/E-Mail/Geburtsdatum/Telefon/
 * Adresse. IBAN/Bankdaten und Kündigungsstatus haben eigene Dialoge/Flows. */
export function MemberPersonendatenFields({
  idPrefix,
  form,
  onChange,
  isAdmin = false,
}: {
  idPrefix: string;
  form: MemberPersonendatenForm;
  onChange: <K extends keyof MemberPersonendatenForm>(
    key: K,
    value: MemberPersonendatenForm[K],
  ) => void;
  /** = `admin:access` — schaltet zusammen mit `NODE_ENV === "development"`
   * den Demo-Adresse-Button frei (schnelles Testen von MiniMeeple-Anlagen
   * ohne echte Adresse eintippen zu müssen). */
  isAdmin?: boolean;
}) {
  const category = formContributionCategory(form.birthDate);
  const emailRequired = emailRequiredFor(form.birthDate);
  const showDemoAddressButton =
    isAdmin && process.env.NODE_ENV === "development";
  const age = form.birthDate
    ? ageInYears(new Date(form.birthDate), new Date())
    : null;

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
        required={emailRequired}
      />
      <DatePicker
        id={`${idPrefix}-birthdate`}
        label="Geburtsdatum"
        labelHint={age !== null ? `(${age} Jahre)` : undefined}
        value={form.birthDate}
        onChange={(value) => onChange("birthDate", value)}
        validate={birthDateValidator()}
      />
      <TextField
        id={`${idPrefix}-phone`}
        label="Telefon"
        type="tel"
        value={form.phone}
        onChange={(event) => onChange("phone", event.target.value)}
      />
      <DatePicker
        id={`${idPrefix}-joinedat`}
        label="Beigetreten"
        value={form.joinedAt}
        onChange={(value) => onChange("joinedAt", value)}
      />
      {(category === "mini" || category === "jung") && (
        <p className="text-muted-foreground col-span-2 text-xs">
          {CONTRIBUTION_CATEGORY_LABELS[category]} — die E-Mail-Adresse kann
          leer bleiben, ein:e Erziehungsberechtigte:r wird über die
          Vereinsmitglieder-Verwaltung verknüpft.
        </p>
      )}
      <TextField
        id={`${idPrefix}-street`}
        label="Straße"
        value={form.street}
        onChange={(event) => onChange("street", event.target.value)}
        fieldClassName="col-span-2"
        required
      />
      <TextField
        id={`${idPrefix}-postalcode`}
        label="PLZ"
        value={form.postalCode}
        onChange={(event) => onChange("postalCode", event.target.value)}
        required
      />
      <TextField
        id={`${idPrefix}-city`}
        label={
          <span className="flex items-center justify-between gap-2">
            Ort
            {showDemoAddressButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Demo-Adresse eintragen"
                title="Nur Development + admin:access: Demo-Adresse eintragen"
                onClick={() => {
                  onChange("street", DEMO_ADDRESS.street);
                  onChange("postalCode", DEMO_ADDRESS.postalCode);
                  onChange("city", DEMO_ADDRESS.city);
                }}
              >
                <Wand2 className="size-3.5" />
              </Button>
            )}
          </span>
        }
        value={form.city}
        onChange={(event) => onChange("city", event.target.value)}
        required
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
    joinedAt: form.joinedAt ? new Date(form.joinedAt) : null,
  };
}

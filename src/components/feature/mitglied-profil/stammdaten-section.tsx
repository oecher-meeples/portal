"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { birthDateValidator } from "@/components/ui/constraints";
import { useAction } from "@/components/ui/use-action";
import { formatDatePlain } from "@/lib/utils/format";
import { ageInYears } from "@/lib/members/contribution";
import { STAMMDATEN_FIELD_LABELS } from "@/lib/members/stammdaten-labels";
import type { StammdatenDiff } from "@/lib/members/pending-changes";
import {
  PendingChangesPanel,
  type PendingChangeRow,
} from "@/components/widgets/pending-changes/pending-changes-panel";
import {
  requestMemberStammdatenChange,
  updateMemberStammdaten,
  type StammdatenInput,
} from "@/components/feature/mitglied-profil/stammdaten-actions";
import { OwnPendingChangeNotice } from "@/components/feature/mitglied-profil/own-pending-change-notice";

export type StammdatenMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  birthPlace: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  tshirtSizeId: string | null;
  /** Vereinsbeitritt (Live-Review F1) — getrennt vom
   * Portal-Konto-Anlagedatum (`Meeple.joinedAt`). */
  joinedAt: Date;
};

export type TshirtSizeOption = { id: string; label: string };

const FIELD_KEYS = Object.keys(
  STAMMDATEN_FIELD_LABELS,
) as (keyof StammdatenInput)[];

function toForm(member: StammdatenMember): StammdatenInput {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate?.toISOString().slice(0, 10) ?? null,
    birthPlace: member.birthPlace,
    street: member.street,
    postalCode: member.postalCode,
    city: member.city,
    phone: member.phone,
    tshirtSizeId: member.tshirtSizeId,
    joinedAt: member.joinedAt.toISOString().slice(0, 10),
  };
}

function diffOf(original: StammdatenInput, next: StammdatenInput) {
  const diff: StammdatenDiff = {};
  for (const key of FIELD_KEYS) {
    const oldValue = original[key] ?? null;
    const newValue = next[key]?.trim() || null;
    if (oldValue === newValue) continue;
    diff[key] = {
      old: oldValue,
      new:
        (key === "birthDate" || key === "joinedAt") && newValue
          ? new Date(newValue)
          : newValue,
    };
  }
  return diff;
}

/** Stammdaten-Bereich der Profilseite (#380) — Readonly-Anzeige für alle mit
 * Seitenzugriff; `members:manage` bearbeitet direkt, Meeple-selbst/
 * Erziehungsberechtigte stellen stattdessen einen `MEMBER_STAMMDATEN`-Antrag
 * (#379). Offene Anträge werden darunter nur für `admin:access` gezeigt. */
export function StammdatenSection({
  member,
  canManage,
  canRequestChange,
  isAdmin,
  ownPendingChange = null,
  openChanges,
  tshirtSizeOptions = [],
}: {
  member: StammdatenMember;
  canManage: boolean;
  canRequestChange: boolean;
  isAdmin: boolean;
  /** Eigener noch offener Antrag der aktuellen Session — für den "wartet auf
   * Freigabe"-Hinweis, unabhängig von `isAdmin`. */
  ownPendingChange?: { requestedAt: string } | null;
  openChanges: PendingChangeRow[];
  tshirtSizeOptions?: TshirtSizeOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StammdatenInput>(() => toForm(member));
  const { run, pending, error } = useAction({
    onSuccess: () => setEditing(false),
  });

  function startEdit() {
    setForm(toForm(member));
    setEditing(true);
  }

  async function handleSave() {
    if (canManage) {
      await run(() => updateMemberStammdaten(member.id, form));
      return;
    }
    const diff = diffOf(toForm(member), form);
    if (Object.keys(diff).length === 0) {
      setEditing(false);
      return;
    }
    await run(() => requestMemberStammdatenChange(member.id, diff));
  }

  const canEdit = canManage || canRequestChange;

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold">Stammdaten</h2>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="size-3.5" />
            Bearbeiten
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELD_KEYS.map((key) =>
              key === "tshirtSizeId" ? (
                <div key={key} className="flex flex-col gap-1.5">
                  <label
                    htmlFor="stammdaten-tshirtSizeId"
                    className="text-sm font-medium"
                  >
                    {STAMMDATEN_FIELD_LABELS.tshirtSizeId}
                  </label>
                  <select
                    id="stammdaten-tshirtSizeId"
                    value={form.tshirtSizeId ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        tshirtSizeId: event.target.value || null,
                      }))
                    }
                    className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="">— keine Angabe —</option>
                    {tshirtSizeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : key === "birthDate" || key === "joinedAt" ? (
                <DatePicker
                  key={key}
                  id={`stammdaten-${key}`}
                  label={STAMMDATEN_FIELD_LABELS[key]}
                  labelHint={
                    key === "birthDate" && form.birthDate
                      ? `(${ageInYears(new Date(form.birthDate), new Date())} Jahre)`
                      : undefined
                  }
                  value={form[key] ?? ""}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, [key]: value }))
                  }
                  validate={
                    key === "birthDate" ? birthDateValidator() : undefined
                  }
                />
              ) : (
                <TextField
                  key={key}
                  id={`stammdaten-${key}`}
                  label={STAMMDATEN_FIELD_LABELS[key]}
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                />
              ),
            )}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending}>
              {pending
                ? "Speichere…"
                : canManage
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
          {FIELD_KEYS.map((key) => (
            <div key={key}>
              <dt className="text-muted-foreground">
                {STAMMDATEN_FIELD_LABELS[key]}
              </dt>
              <dd>
                {key === "birthDate"
                  ? member.birthDate
                    ? formatDatePlain(member.birthDate)
                    : "—"
                  : key === "joinedAt"
                    ? formatDatePlain(member.joinedAt)
                    : key === "tshirtSizeId"
                      ? (tshirtSizeOptions.find(
                          (option) => option.id === member.tshirtSizeId,
                        )?.label ?? "—")
                      : (member[key] ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!isAdmin && ownPendingChange && (
        <OwnPendingChangeNotice requestedAt={ownPendingChange.requestedAt} />
      )}

      {isAdmin && openChanges.length > 0 && (
        <PendingChangesPanel
          title="Offene Änderungsanträge"
          changes={openChanges}
        />
      )}
    </div>
  );
}

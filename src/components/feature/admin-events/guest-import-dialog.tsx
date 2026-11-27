"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Field } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { NativeSelect } from "@/components/ui/native-select";
import { decodeCsvBuffer } from "@/lib/utils/csv";
import {
  applyRoleChoices,
  collectUnknownRoleNames,
  parseGuestImportCsv,
  roleNameKey,
  suggestRoleChoice,
  type GuestImportContext,
  type GuestRoleChoice,
  type ParsedGuestImport,
} from "@/lib/events/guest-import-csv";
import { commitGuestImport } from "@/components/feature/admin-events/guest-import-actions";

function choiceToValue(choice: GuestRoleChoice): string {
  return choice.kind === "role" ? `role:${choice.roleId}` : choice.kind;
}

function valueToChoice(value: string): GuestRoleChoice {
  if (value.startsWith("role:")) {
    return { kind: "role", roleId: value.slice("role:".length) };
  }
  return value === "skip" ? { kind: "skip" } : { kind: "create" };
}

/**
 * Gast-Helfer per CSV importieren (#698): Datei wird im Browser gelesen und
 * geparst. Rollennamen, die es noch nicht gibt, werden aufgelistet — pro Name
 * lässt sich eine vorhandene Rolle zuordnen, die Rolle neu anlegen oder der
 * Name ignorieren. Die Vorschau zeigt gültige und verworfene Zeilen.
 */
export function GuestImportDialog({
  eventId,
  days,
  helperRoles,
}: {
  eventId: string;
  days: GuestImportContext["days"];
  helperRoles: GuestImportContext["roles"];
}) {
  const [parsed, setParsed] = useState<ParsedGuestImport | null>(null);
  const [choices, setChoices] = useState<Record<string, GuestRoleChoice>>({});

  const unknownRoles = useMemo(
    () => (parsed ? collectUnknownRoleNames(parsed.rows) : []),
    [parsed],
  );
  const resolved = useMemo(
    () => (parsed ? applyRoleChoices(parsed, choices) : null),
    [parsed, choices],
  );
  const newRoleCount = new Set(
    (resolved?.rows ?? []).flatMap((row) => row.newRoleNames.map(roleNameKey)),
  ).size;

  async function handleFile(file: File) {
    const result = parseGuestImportCsv(
      decodeCsvBuffer(await file.arrayBuffer()),
      { days, roles: helperRoles },
    );
    setChoices(
      Object.fromEntries(
        collectUnknownRoleNames(result.rows).map((name) => [
          roleNameKey(name),
          suggestRoleChoice(name, helperRoles),
        ]),
      ),
    );
    setParsed(result);
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          <Upload className="size-4" />
          Gast-Helfer importieren
        </Button>
      }
      title="Gast-Helfer importieren"
      description="CSV mit den Spalten Name;Tag;Von;Bis;Rollen (Tag TT.MM.JJJJ, Zeit HH:MM, Rollen kommagetrennt). Gäste ohne Account erscheinen im Helferpool; erneutes Importieren ersetzt ihre Meldung für den Tag."
      contentClassName="sm:max-w-xl"
      submitLabel="Importieren"
      canSubmit={(resolved?.rows.length ?? 0) > 0}
      onReset={() => {
        setParsed(null);
        setChoices({});
      }}
      action={async () => {
        if (!resolved) return { error: "Bitte zuerst eine Datei wählen." };
        const result = await commitGuestImport(eventId, resolved.rows);
        return "error" in result ? result : { success: true };
      }}
    >
      <FileField
        id="guest-import-file"
        label="CSV-Datei"
        accept=".csv,text/csv"
        onFilesSelected={(files) => {
          if (files[0]) void handleFile(files[0]);
        }}
      />
      {unknownRoles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {unknownRoles.length} unbekannte Rolle(n) in der Datei
          </p>
          {unknownRoles.map((name) => (
            <Field
              key={name}
              label={name}
              htmlFor={`guest-import-role-${roleNameKey(name)}`}
            >
              <NativeSelect
                id={`guest-import-role-${roleNameKey(name)}`}
                size="md"
                className="w-full"
                value={choiceToValue(
                  choices[roleNameKey(name)] ?? { kind: "create" },
                )}
                onChange={(event) =>
                  setChoices((current) => ({
                    ...current,
                    [roleNameKey(name)]: valueToChoice(event.target.value),
                  }))
                }
              >
                <option value="create">Als neue Rolle anlegen</option>
                <option value="skip">Ignorieren</option>
                {helperRoles.map((role) => (
                  <option key={role.id} value={`role:${role.id}`}>
                    Zuordnen zu „{role.name}“
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ))}
        </div>
      )}
      {resolved && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {resolved.rows.length} Zeile(n) werden importiert
            {resolved.errors.length > 0 &&
              `, ${resolved.errors.length} verworfen`}
            {newRoleCount > 0 && `, ${newRoleCount} neue Rolle(n) angelegt`}.
          </p>
          {resolved.errors.length > 0 && (
            <ul className="text-destructive max-h-40 list-disc overflow-y-auto pl-5">
              {resolved.errors.map((error) => (
                <li key={`${error.line}-${error.message}`}>{error.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ActionDialog>
  );
}

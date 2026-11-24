"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, TextField } from "@/components/ui/field";
import { IdCombobox } from "@/components/ui/id-combobox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { memberFullName } from "@/lib/members/member-display-name";
import {
  guardianOptions,
  linkableLogin,
  type ImportDecisions,
  type ImportGroup,
  type ImportIssue,
  type ImportPreviewRow,
  type MemberImportPreview,
  type RowDecision,
} from "@/lib/members/member-import-decisions";

export type RowEditorContext = {
  preview: MemberImportPreview;
  decisions: ImportDecisions;
  issuesByLine: Map<number, ImportIssue[]>;
  onChange: (line: number, patch: Partial<RowDecision>) => void;
};

export function rowName(row: ImportPreviewRow): string {
  return memberFullName(row) || "(ohne Namen)";
}

/** Die eine Komponente für „eigene/andere E-Mail" (#611) — Gruppen-
 * Erziehungsberechtigte, Login-Konflikt und Erwachsene ohne E-Mail. Mit
 * `sharedEmail` bietet sie an, die gemeinsame Adresse zu behalten. */
function ImportEmailField({
  id,
  label,
  value,
  onChange,
  sharedEmail,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  sharedEmail?: string;
}) {
  const keepsShared =
    sharedEmail !== undefined && value.trim().toLowerCase() === sharedEmail;
  return (
    <div className="flex flex-col gap-1.5">
      <TextField
        id={id}
        label={label}
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {sharedEmail && !keepsShared && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange(sharedEmail)}
        >
          Gemeinsame Adresse behalten
        </Button>
      )}
    </div>
  );
}

/** Zusätzliche Erziehungsberechtigte eines Kindes: gewählte Liste mit
 * Entfernen-Button plus `IdCombobox` zum Hinzufügen (n:m). */
function GuardianPicker({
  context,
  row,
}: {
  context: RowEditorContext;
  row: ImportPreviewRow;
}) {
  const { preview, decisions, onChange } = context;
  const chosen = decisions[row.line]?.guardians ?? [];
  const options = guardianOptions(preview, decisions, row.line);
  const labelOf = (id: string) =>
    options.find((option) => option.id === id)?.label ?? id;

  return (
    <Field label="Erziehungsberechtigte" htmlFor={`guardians-${row.line}`}>
      {chosen.length > 0 && (
        <ul className="flex flex-col gap-1">
          {chosen.map((ref) => (
            <li key={ref} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{labelOf(ref)}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={`${labelOf(ref)} entfernen`}
                onClick={() =>
                  onChange(row.line, {
                    guardians: chosen.filter((other) => other !== ref),
                  })
                }
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <IdCombobox
        options={options.filter((option) => !chosen.includes(option.id))}
        value={null}
        onValueChange={(id) => {
          if (id) onChange(row.line, { guardians: [...chosen, id] });
        }}
        placeholder="Erziehungsberechtigte:n hinzufügen …"
      />
    </Field>
  );
}

/** Eine Zeile mit offener Entscheidung — Rolle, E-Mail, Verknüpfung,
 * Erziehungsberechtigte, je nach Status. */
export function RowEditor({
  context,
  row,
  group,
}: {
  context: RowEditorContext;
  row: ImportPreviewRow;
  group?: ImportGroup;
}) {
  const { preview, decisions, issuesByLine, onChange } = context;
  const decision = decisions[row.line];
  if (!decision) return null;
  const login = linkableLogin(preview, row);
  const issues = issuesByLine.get(row.line) ?? [];
  const canLink = login !== null && (!group || !group.anchor);

  return (
    <div className="flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          {rowName(row)}{" "}
          <span className="text-muted-foreground font-normal">
            Nr. {row.memberNumber} · Zeile {row.line}
          </span>
        </p>
        {row.status !== "loginConflict" && (
          <NativeSelect
            aria-label={`Rolle für Zeile ${row.line}`}
            value={decision.role ?? ""}
            onChange={(event) =>
              onChange(row.line, {
                role: (event.target.value || null) as RowDecision["role"],
              })
            }
            size="compact"
          >
            <option value="">— Rolle wählen —</option>
            <option value="adult">
              {group || row.status === "needsRole"
                ? "Erziehungsberechtigt / erwachsen"
                : "Erwachsen"}
            </option>
            <option value="child">Kind</option>
          </NativeSelect>
        )}
      </div>

      {decision.role === "adult" && (
        <>
          {canLink && (
            <Label className="flex items-center justify-between gap-2 font-normal">
              Mit Konto „{login.displayName}“ verknüpfen
              <Switch
                checked={decision.linkMeeple}
                onCheckedChange={(checked) =>
                  onChange(row.line, { linkMeeple: checked })
                }
              />
            </Label>
          )}
          {!decision.linkMeeple && (
            <ImportEmailField
              id={`import-email-${row.line}`}
              label={
                group
                  ? "Eigene E-Mail (Pflicht)"
                  : row.status === "loginConflict"
                    ? "Andere E-Mail (optional, leer = ohne E-Mail)"
                    : "E-Mail (optional)"
              }
              value={decision.email}
              onChange={(email) => onChange(row.line, { email })}
              sharedEmail={group && !group.anchor ? group.email : undefined}
            />
          )}
        </>
      )}

      {decision.role === "child" && (
        <>
          {group && (
            <p className="text-muted-foreground text-sm">
              Wird ohne E-Mail angelegt und mit allen Erziehungsberechtigten der
              Gruppe verknüpft
              {group.anchor ? `, auch mit ${group.anchor.name}` : ""}.
            </p>
          )}
          <GuardianPicker context={context} row={row} />
        </>
      )}

      {issues.length > 0 && (
        <ul className="text-destructive text-sm">
          {issues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Karte einer Gruppe mit gleicher E-Mail (#611). */
export function GroupCard({
  context,
  group,
}: {
  context: RowEditorContext;
  group: ImportGroup;
}) {
  const rows = context.preview.rows.filter((row) =>
    group.lines.includes(row.line),
  );
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base break-all">{group.email}</CardTitle>
        <CardDescription>
          {group.anchor
            ? `Gehört bereits ${group.anchor.name} und bleibt dort. Neue Zeilen werden Kind (verknüpft) oder brauchen eine eigene Adresse.`
            : "Genau ein:e Erziehungsberechtigte:r behält die gemeinsame Adresse, alle weiteren brauchen eine eigene. Kinder werden ohne E-Mail mit allen Erziehungsberechtigten verknüpft."}
        </CardDescription>
      </CardHeader>
      {rows.map((row) => (
        <RowEditor key={row.line} context={context} row={row} group={group} />
      ))}
    </Card>
  );
}

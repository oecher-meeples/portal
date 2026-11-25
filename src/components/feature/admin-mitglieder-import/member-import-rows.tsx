"use client";

import { useState } from "react";
import { Undo2, UserX, Users } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { IdCombobox } from "@/components/ui/id-combobox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { linkableLogin } from "@/lib/members/member-import-decisions";
import {
  familyOfLine,
  familyTargetOptions,
  hasSharedEmail,
  importRowName,
  sharedEmailKeeper,
  type ImportFamily,
} from "@/lib/members/member-import-families";
import {
  DragHandle,
  DropColumn,
} from "@/components/feature/admin-mitglieder-import/member-import-dnd";
import type {
  ImportDecisions,
  ImportIssue,
  ImportPreviewRow,
  MemberImportPreview,
  RowDecision,
} from "@/lib/members/member-import-types";

export type ImportEditorContext = {
  preview: MemberImportPreview;
  decisions: ImportDecisions;
  families: ImportFamily[];
  /** Zeilenbezogene Punkte (ohne `familyKey`). */
  issuesByLine: Map<number, ImportIssue[]>;
  onChange: (line: number, patch: Partial<RowDecision>) => void;
};

export function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="text-destructive text-sm">
      {issues.map((issue) => (
        <li key={issue.message}>{issue.message}</li>
      ))}
    </ul>
  );
}

const CHECK_CLASS = "accent-primary size-4 shrink-0";

/** E-Mail eines Erwachsenen (#611): Hüter der gemeinsamen Adresse wählen,
 * sonst eigene Adresse oder „Erstmal leer lassen", dazu ggf. die
 * Verknüpfung mit einem bestehenden Login. */
export function AdultEmailEditor({
  context,
  row,
}: {
  context: ImportEditorContext;
  row: ImportPreviewRow;
}) {
  const { preview, decisions, families, onChange } = context;
  const decision = decisions[row.line];
  const family = familyOfLine(families, row.line);
  const keeper = family ? sharedEmailKeeper(family, decisions) : null;
  const isKeeper = keeper === row.line;
  const login = linkableLogin(preview, family, decisions, row);
  const adultCount =
    family?.lines.filter((line) => decisions[line]?.role === "adult").length ??
    1;

  function chooseKeeper() {
    if (!family) return;
    for (const line of family.lines) {
      onChange(line, { keepsSharedEmail: line === row.line });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {hasSharedEmail(family) &&
        (adultCount > 1 ? (
          <Label className="font-normal">
            <input
              type="radio"
              name={`keeper-${family.key}`}
              className={CHECK_CLASS}
              checked={isKeeper}
              onChange={chooseKeeper}
            />
            Behält {family.email}
          </Label>
        ) : (
          <p className="text-muted-foreground text-sm">Behält {family.email}</p>
        ))}
      {login && (
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
      {!isKeeper && !(login && decision.linkMeeple) && (
        <>
          <TextField
            id={`import-email-${row.line}`}
            label={family ? "Neue E-Mail-Adresse" : "E-Mail (optional)"}
            type="email"
            value={decision.email}
            disabled={decision.noEmail}
            onChange={(event) =>
              onChange(row.line, { email: event.target.value })
            }
          />
          {family && (
            <Label className="font-normal">
              <input
                type="checkbox"
                className={CHECK_CLASS}
                checked={decision.noEmail}
                onChange={(event) =>
                  onChange(row.line, { noEmail: event.target.checked })
                }
              />
              Erstmal leer lassen
            </Label>
          )}
        </>
      )}
    </div>
  );
}

/** „Nicht importieren": die Zeile wird bewusst nicht angelegt und fällt aus
 * ihrer Familie heraus; unter „Nicht importieren" rückgängig zu machen. */
export function SkipButton({
  row,
  onChange,
}: {
  row: ImportPreviewRow;
  onChange: ImportEditorContext["onChange"];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`${importRowName(row)} nicht importieren`}
      onClick={() => onChange(row.line, { skip: true })}
    >
      <UserX />
      Nicht importieren
    </Button>
  );
}

/** Ablage der ausgeschlossenen Zeilen — Ziel für Drag & Drop, mit
 * „Doch importieren" je Zeile. */
export function SkippedRows({
  rows,
  onChange,
}: {
  rows: ImportPreviewRow[];
  onChange: ImportEditorContext["onChange"];
}) {
  return (
    <DropColumn
      target={{ skip: true }}
      title={`Nicht importieren (${rows.length})`}
      emptyHint="Personen hierher ziehen, die nicht angelegt werden sollen."
    >
      {rows.map((row) => (
        <div
          key={row.line}
          className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
        >
          <p className="text-sm">
            <span className="font-medium">{importRowName(row)}</span>{" "}
            <span className="text-muted-foreground text-xs">
              Nr. {row.memberNumber} · Zeile {row.line}
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(row.line, { skip: false })}
          >
            <Undo2 />
            Doch importieren
          </Button>
        </div>
      ))}
    </DropColumn>
  );
}

/** „Einer anderen Familie zuweisen": wählt eine Person (Datei oder
 * Bestand), die Zeile wandert in deren Familie — ggf. entsteht dabei eine
 * neue. Landet dort in „Nicht zugewiesen". */
export function MoveToFamilyButton({
  context,
  row,
  label,
}: {
  context: ImportEditorContext;
  row: ImportPreviewRow;
  label: string;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const options = familyTargetOptions(
    context.preview,
    context.decisions,
    context.families,
    row.line,
  );
  return (
    <ActionDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Users />
          {label}
        </Button>
      }
      title={`${importRowName(row)} einer Familie zuweisen`}
      description="Person wählen, zu deren Familie sie gehört. Dort landet sie unter „Nicht zugewiesen“."
      submitLabel="Zuweisen"
      canSubmit={target !== null}
      onReset={() => setTarget(null)}
      action={async () => {
        context.onChange(row.line, {
          family: target,
          role: null,
          keepsSharedEmail: false,
        });
      }}
    >
      <IdCombobox
        options={options}
        value={target}
        onValueChange={setTarget}
        placeholder="Person suchen …"
      />
    </ActionDialog>
  );
}

/** Zeilen ohne Familie, die eine Entscheidung brauchen (keine E-Mail oder
 * E-Mail eines Logins ohne Mitglied). */
export function SoloRowsCard({
  context,
  title,
  rows,
}: {
  context: ImportEditorContext;
  title: string;
  rows: ImportPreviewRow[];
}) {
  const { decisions, issuesByLine, onChange } = context;
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {rows.map((row) => {
        const decision = decisions[row.line];
        if (!decision) return null;
        return (
          <div
            key={row.line}
            className="flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <DragHandle row={row} />
                {importRowName(row)}{" "}
                <span className="text-muted-foreground font-normal">
                  Nr. {row.memberNumber} · Zeile {row.line}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {decision.role !== "adult" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(row.line, { role: "adult" })}
                  >
                    Als Erwachsene:r anlegen
                  </Button>
                )}
                <MoveToFamilyButton
                  context={context}
                  row={row}
                  label="Einer Familie zuweisen"
                />
                <SkipButton row={row} onChange={onChange} />
              </div>
            </div>
            {decision.role === "adult" && (
              <AdultEmailEditor context={context} row={row} />
            )}
            <IssueList issues={issuesByLine.get(row.line) ?? []} />
          </div>
        );
      })}
    </Card>
  );
}

"use client";

import { ArrowLeft, ArrowRight, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  importRowName,
  suggestGuardianLine,
  type ImportFamily,
} from "@/lib/members/member-import-families";
import type {
  ImportIssue,
  ImportPreviewRow,
} from "@/lib/members/member-import-types";
import {
  AdultEmailEditor,
  IssueList,
  MoveToFamilyButton,
  SkipButton,
  type ImportEditorContext,
} from "@/components/feature/admin-mitglieder-import/member-import-rows";
import {
  DragHandle,
  DropColumn,
} from "@/components/feature/admin-mitglieder-import/member-import-dnd";

function PersonCard({
  context,
  row,
  suggested,
}: {
  context: ImportEditorContext;
  row: ImportPreviewRow;
  suggested: boolean;
}) {
  const { decisions, issuesByLine, onChange } = context;
  const decision = decisions[row.line];
  const setRole = (role: "adult" | "child" | null) =>
    onChange(row.line, { role });

  return (
    <div className="bg-card flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <DragHandle row={row} />
        <p className="text-sm font-medium">{importRowName(row)}</p>
        <span className="text-muted-foreground text-xs">
          Nr. {row.memberNumber} · Zeile {row.line}
        </span>
        {suggested && decision.role === "adult" && (
          <Badge variant="outline">Vorschlag aus E-Mail</Badge>
        )}
      </div>

      {decision.role === "adult" && (
        <AdultEmailEditor context={context} row={row} />
      )}

      <div className="flex flex-wrap gap-2">
        {decision.role === null ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRole("adult")}
            >
              <ArrowLeft />
              Erziehungsberechtigt
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRole("child")}
            >
              Kind
              <ArrowRight />
            </Button>
            <MoveToFamilyButton
              context={context}
              row={row}
              label="Andere Familie …"
            />
            {decision.family && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(row.line, { family: null })}
              >
                <Undo2 />
                Zuweisung aufheben
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRole(null)}
          >
            {decision.role === "adult" ? <ArrowRight /> : <ArrowLeft />}
            Nicht zugewiesen
          </Button>
        )}
        <SkipButton row={row} onChange={onChange} />
      </div>

      <IssueList issues={issuesByLine.get(row.line) ?? []} />
    </div>
  );
}

function familyTitle(family: ImportFamily, rows: ImportPreviewRow[]): string {
  if (family.email) return family.email;
  if (family.anchor) return `Familie von ${family.anchor.name}`;
  return `Familie ${rows[0].lastName ?? importRowName(rows[0])}`;
}

function familyDescription(family: ImportFamily): string {
  if (family.anchor) {
    return `${family.anchor.name} ist bereits Mitglied${family.email ? " und behält die Adresse" : ""}. Kinder werden mit allen Erziehungsberechtigten verknüpft.`;
  }
  if (family.email) {
    return "Ein:e Erziehungsberechtigte:r behält die gemeinsame Adresse, alle weiteren bekommen eine neue oder vorerst keine. Kinder werden ohne E-Mail mit allen Erziehungsberechtigten verknüpft.";
  }
  return "Ohne gemeinsame Adresse (über Nachnamen oder Zuweisung zusammengestellt): Erziehungsberechtigte brauchen eine eigene E-Mail-Adresse oder bleiben vorerst ohne. Kinder werden ohne E-Mail mit allen Erziehungsberechtigten verknüpft.";
}

/** Eine Familie in drei Spalten (#611): links Erziehungsberechtigte, in der
 * Mitte noch nicht Zugewiesene, rechts Kinder. */
export function FamilyCard({
  context,
  family,
  issues,
}: {
  context: ImportEditorContext;
  family: ImportFamily;
  /** Familienbezogene Punkte (`familyKey === family.key`). */
  issues: ImportIssue[];
}) {
  const rows = context.preview.rows.filter((row) =>
    family.lines.includes(row.line),
  );
  const suggested =
    family.email && !family.anchor
      ? suggestGuardianLine(family.email, rows)
      : null;
  const byRole = (role: "adult" | "child" | null) =>
    rows
      .filter((row) => (context.decisions[row.line]?.role ?? null) === role)
      .map((row) => (
        <PersonCard
          key={row.line}
          context={context}
          row={row}
          suggested={row.line === suggested}
        />
      ));

  const adults = byRole("adult");
  if (family.anchor) {
    adults.unshift(
      <div
        key="anchor"
        className="bg-card flex flex-col gap-1 rounded-md border border-dashed p-3"
      >
        <p className="text-sm font-medium">{family.anchor.name}</p>
        <p className="text-muted-foreground text-xs">
          Bestehendes Mitglied{family.email ? `, behält ${family.email}` : ""}
        </p>
      </div>,
    );
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base break-all">
          {familyTitle(family, rows)}
        </CardTitle>
        <CardDescription>{familyDescription(family)}</CardDescription>
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-3">
        <DropColumn
          target={{ familyKey: family.key, role: "adult" }}
          title="Erziehungsberechtigte"
        >
          {adults}
        </DropColumn>
        <DropColumn
          target={{ familyKey: family.key, role: null }}
          title="Nicht zugewiesen"
          className="order-first md:order-none"
        >
          {byRole(null)}
        </DropColumn>
        <DropColumn
          target={{ familyKey: family.key, role: "child" }}
          title="Kinder"
        >
          {byRole("child")}
        </DropColumn>
      </div>
      <IssueList issues={issues} />
    </Card>
  );
}

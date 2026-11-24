"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileField } from "@/components/ui/file-field";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAction } from "@/components/ui/use-action";
import {
  decodeMemberCsv,
  parseMemberImportCsv,
  type MemberImportLineError,
  type MemberImportRow,
} from "@/lib/members/member-import-csv";
import {
  initialImportDecisions,
  validateImportDecisions,
} from "@/lib/members/member-import-decisions";
import {
  familyOfLine,
  importRowName,
  resolveFamilies,
} from "@/lib/members/member-import-families";
import {
  CREATABLE_STATUSES,
  isImportedRow,
  type ImportDecisions,
  type ImportIssue,
  type ImportPreviewRow,
  type MemberImportPreview,
  type RowDecision,
} from "@/lib/members/member-import-types";
import {
  commitMemberImport,
  previewMemberImport,
} from "@/components/feature/admin-mitglieder-import/member-import-actions";
import {
  SkipButton,
  SkippedRows,
  SoloRowsCard,
  type ImportEditorContext,
} from "@/components/feature/admin-mitglieder-import/member-import-rows";
import { FamilyCard } from "@/components/feature/admin-mitglieder-import/member-import-family-card";
import { ImportDndProvider } from "@/components/feature/admin-mitglieder-import/member-import-dnd";

type Loaded = {
  rows: MemberImportRow[];
  parseErrors: MemberImportLineError[];
  preview: MemberImportPreview;
};

function RowList({
  rows,
  action,
}: {
  rows: ImportPreviewRow[];
  action?: (row: ImportPreviewRow) => ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li
          key={row.line}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <span>
            {importRowName(row)}{" "}
            <span className="text-muted-foreground">
              Nr. {row.memberNumber}
              {row.email ? ` · ${row.email}` : ""}
            </span>
          </span>
          {action?.(row)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Mitgliederliste-Import (#611): Datei wird im Browser gelesen und geparst,
 * nur die Zeilen gehen an `previewMemberImport`. Vorschau und Entscheidungen
 * leben ausschließlich im Client-State — wer die Seite verlässt, verliert sie.
 */
export function MemberImportView() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [decisions, setDecisions] = useState<ImportDecisions>({});
  const [created, setCreated] = useState<number | null>(null);
  const previewAction = useAction();
  const commitAction = useAction();

  async function handleFile(file: File) {
    setLoaded(null);
    setCreated(null);
    const { rows, errors } = parseMemberImportCsv(
      decodeMemberCsv(await file.arrayBuffer()),
    );
    await previewAction.run(async () => {
      const result = await previewMemberImport(rows);
      if ("error" in result) return result;
      setLoaded({ rows, parseErrors: errors, preview: result.value });
      setDecisions(initialImportDecisions(result.value));
    });
  }

  async function handleCommit() {
    if (!loaded) return;
    await commitAction.run(async () => {
      const result = await commitMemberImport(loaded.rows, decisions);
      if ("error" in result) return result;
      setCreated(result.value.created);
      setLoaded(null);
    });
  }

  const issues = useMemo<ImportIssue[]>(
    () => (loaded ? validateImportDecisions(loaded.preview, decisions) : []),
    [loaded, decisions],
  );
  const families = useMemo(
    () => (loaded ? resolveFamilies(loaded.preview, decisions) : []),
    [loaded, decisions],
  );
  const issuesByLine = useMemo(() => {
    const byLine = new Map<number, ImportIssue[]>();
    for (const issue of issues) {
      if (issue.familyKey) continue;
      byLine.set(issue.line, [...(byLine.get(issue.line) ?? []), issue]);
    }
    return byLine;
  }, [issues]);

  const rows = loaded?.preview.rows ?? [];
  const solo = (row: ImportPreviewRow) => !familyOfLine(families, row.line);
  const byStatus = (status: ImportPreviewRow["status"]) =>
    rows.filter((row) => row.status === status);
  const imported = (row: ImportPreviewRow) => isImportedRow(row, decisions);
  const openRows = rows.filter(
    (row) => imported(row) && row.status !== "ready" && solo(row),
  );
  const loginRows = openRows.filter((row) => row.status === "loginConflict");
  const noEmailRows = openRows.filter((row) => row.status !== "loginConflict");
  const readyRows = byStatus("ready").filter(
    (row) => imported(row) && solo(row),
  );
  const skippedRows = rows.filter(
    (row) => CREATABLE_STATUSES.has(row.status) && !imported(row),
  );
  const errorCount =
    (loaded?.parseErrors.length ?? 0) + byStatus("error").length;
  const createCount = rows.filter(imported).length;

  const context: ImportEditorContext | null = loaded
    ? {
        preview: loaded.preview,
        decisions,
        families,
        issuesByLine,
        onChange: (line, patch: Partial<RowDecision>) =>
          setDecisions((prev) => ({
            ...prev,
            [line]: { ...prev[line], ...patch },
          })),
      }
    : null;

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Administration"
        title="Mitgliederliste importieren"
        description="CSV-Export der Vereinsverwaltung (mitglied_email;mitglied_name;mitglied_vorname;mitglied_nr). Die Datei wird nur im Browser gelesen und nirgends gespeichert. Es werden keine Einladungen verschickt."
      />

      <Card>
        <FileField
          id="member-import-file"
          label="CSV-Datei"
          accept=".csv,text/csv"
          disabled={previewAction.pending || commitAction.pending}
          onFilesSelected={(files) => {
            const file = files[0];
            if (file) void handleFile(file);
          }}
        />
        {previewAction.pending && (
          <p className="text-muted-foreground text-sm">Gleiche ab …</p>
        )}
        {previewAction.error && (
          <p className="text-destructive text-sm">{previewAction.error}</p>
        )}
        {created !== null && (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{created} Mitglied(er) angelegt.</p>
            <Link
              href="/admin/mitglieder"
              className={buttonVariants({
                variant: "outline",
                className: "w-fit",
              })}
            >
              Zur Mitgliederverwaltung
            </Link>
          </div>
        )}
      </Card>

      {loaded && context && (
        <>
          {(families.length > 0 ||
            openRows.length > 0 ||
            skippedRows.length > 0) && (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-lg font-semibold">
                Offene Entscheidungen
              </h2>
              <p className="text-muted-foreground text-sm">
                Personen am Griff in die passende Spalte ziehen – auch in eine
                andere Familie – oder die Buttons nutzen.
              </p>
              <ImportDndProvider
                preview={context.preview}
                decisions={decisions}
                families={families}
                onChange={context.onChange}
              >
                {families.map((family) => (
                  <FamilyCard
                    key={family.key}
                    context={context}
                    family={family}
                    issues={issues.filter(
                      (issue) => issue.familyKey === family.key,
                    )}
                  />
                ))}
                {noEmailRows.length > 0 && (
                  <SoloRowsCard
                    context={context}
                    title="Ohne E-Mail"
                    rows={noEmailRows}
                  />
                )}
                {loginRows.length > 0 && (
                  <SoloRowsCard
                    context={context}
                    title="E-Mail gehört einem bestehenden Konto"
                    rows={loginRows}
                  />
                )}
                <SkippedRows rows={skippedRows} onChange={context.onChange} />
              </ImportDndProvider>
            </section>
          )}

          {errorCount > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-lg font-semibold">
                Fehler – wird nicht importiert ({errorCount})
              </h2>
              <Card>
                <ul className="text-destructive flex flex-col gap-1 text-sm">
                  {loaded.parseErrors.map((error) => (
                    <li key={`parse-${error.line}`}>{error.message}</li>
                  ))}
                  {byStatus("error").map((row) => (
                    <li key={row.line}>
                      Zeile {row.line} ({importRowName(row)}): {row.message}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <Card>
            <Accordion>
              <AccordionItem value="ready">
                <AccordionTrigger>
                  Wird angelegt ohne Rückfrage ({readyRows.length})
                </AccordionTrigger>
                <AccordionPanel>
                  <RowList
                    rows={readyRows}
                    action={(row) => (
                      <SkipButton row={row} onChange={context.onChange} />
                    )}
                  />
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem value="skipped">
                <AccordionTrigger>
                  Vorhanden, übersprungen ({byStatus("skipped").length})
                </AccordionTrigger>
                <AccordionPanel>
                  <RowList rows={byStatus("skipped")} />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Card>

          <div className="bg-background sticky bottom-16 z-10 flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center md:bottom-0">
            <Button
              onClick={handleCommit}
              disabled={
                commitAction.pending || issues.length > 0 || createCount === 0
              }
            >
              {commitAction.pending
                ? "Lege an …"
                : `${createCount} Mitglieder anlegen`}
            </Button>
            {issues.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {issues.length} offene(r) Punkt(e) – erst danach anlegbar.
              </p>
            )}
            {commitAction.error && (
              <p className="text-destructive text-sm">{commitAction.error}</p>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}

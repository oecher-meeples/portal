import { ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type {
  BulkImportCandidateDetails,
  BulkImportRow,
} from "@/lib/ludothek/board-games-bulk-import";

type ImportedRow = Extract<BulkImportRow, { status: "imported" }>;
type DuplicateRow = Extract<BulkImportRow, { status: "skipped-duplicate" }>;
type NotImportedRow = Extract<
  BulkImportRow,
  { status: "needs-review" | "failed" }
>;

/** Groups the flat result list into the three report sections (#186-Folge) —
 * "needs-review" and "failed" share one bucket since both mean "wurde nicht
 * angelegt", just with a different reason. */
function groupResults(results: BulkImportRow[]) {
  return {
    imported: results.filter(
      (row): row is ImportedRow => row.status === "imported",
    ),
    duplicates: results.filter(
      (row): row is DuplicateRow => row.status === "skipped-duplicate",
    ),
    notImported: results.filter(
      (row): row is NotImportedRow =>
        row.status === "needs-review" || row.status === "failed",
    ),
  };
}

/**
 * The three-section import report ("Erfolgreich importiert" / "Bereits
 * vorhanden" / "Nicht importiert") shown after a Massenimport-Lauf
 * (#186-Folge) — pulled out of the dialog itself to keep that file under the
 * 400-Zeilen-Grenze; owns only the display, all state stays with the caller.
 */
export function BulkImportResultReport({
  results,
  resolvingName,
  candidateDetails,
  onResolveCandidate,
}: {
  results: BulkImportRow[];
  resolvingName: string | null;
  candidateDetails: Record<number, BulkImportCandidateDetails>;
  onResolveCandidate: (name: string, bggId: number) => void;
}) {
  const { imported, duplicates, notImported } = groupResults(results);

  return (
    <Accordion multiple defaultValue={["not-imported"]}>
      {imported.length > 0 && (
        <AccordionItem value="imported">
          <AccordionTrigger>
            <SectionLabel
              label="Erfolgreich importiert"
              count={imported.length}
              tone="positive"
            />
          </AccordionTrigger>
          <AccordionPanel>
            <ImportedRowList rows={imported} />
          </AccordionPanel>
        </AccordionItem>
      )}
      {duplicates.length > 0 && (
        <AccordionItem value="duplicates">
          <AccordionTrigger>
            <SectionLabel
              label="Bereits vorhanden"
              count={duplicates.length}
              tone="warning"
            />
          </AccordionTrigger>
          <AccordionPanel>
            <DuplicateRowList rows={duplicates} />
          </AccordionPanel>
        </AccordionItem>
      )}
      {notImported.length > 0 && (
        <AccordionItem value="not-imported">
          <AccordionTrigger>
            <SectionLabel
              label="Nicht importiert"
              count={notImported.length}
              tone="negative"
            />
          </AccordionTrigger>
          <AccordionPanel>
            <ResultRowList
              rows={notImported}
              resolvingName={resolvingName}
              candidateDetails={candidateDetails}
              onResolveCandidate={onResolveCandidate}
            />
          </AccordionPanel>
        </AccordionItem>
      )}
    </Accordion>
  );
}

/** Accordion header text plus a color-coded count badge (#186-Folge). */
function SectionLabel({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: StatusTone;
}) {
  return (
    <span className="flex items-center gap-2">
      {label} <StatusPill label={String(count)} tone={tone} />
    </span>
  );
}

/** Compact one-line-per-title list for successfully imported titles, each
 * with a button to open its detail page in a new tab (#186-Folge). */
function ImportedRowList({ rows }: { rows: ImportedRow[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => (
        <li
          key={row.name}
          className="flex items-center justify-between gap-2 py-1.5 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            {row.title !== row.name && (
              <p className="text-muted-foreground truncate text-xs">
                Eingegeben als: {row.name}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${row.title} in der Ludothek öffnen`}
            className="shrink-0"
            render={
              <a
                href={`/ludothek/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Compact one-line-per-title list for titles already in the Bestand
 * (#186-Folge) — BGG-ID and "Eingegeben als" sit in a right-aligned column
 * next to the title instead of stacked below it, to stay as compact as
 * `ImportedRowList`. */
function DuplicateRowList({ rows }: { rows: DuplicateRow[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => (
        <li
          key={row.name}
          className="flex items-center justify-between gap-4 py-1.5 text-sm"
        >
          <p className="min-w-0 truncate font-medium">{row.title}</p>
          <div className="text-muted-foreground shrink-0 text-right text-xs">
            <p>BGG-ID {row.bggId}</p>
            {row.title !== row.name && <p>Eingegeben als: {row.name}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One row per import result for the "Nicht importiert"-Sektion (#186-Folge)
 * — candidates offer a button per BGG-Treffer to resolve the row right there
 * instead of re-typing the title. */
function ResultRowList({
  rows,
  resolvingName,
  candidateDetails,
  onResolveCandidate,
}: {
  rows: NotImportedRow[];
  resolvingName: string | null;
  candidateDetails: Record<number, BulkImportCandidateDetails>;
  onResolveCandidate: (name: string, bggId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.name} className="rounded-md border p-2 text-sm">
          <p className="font-medium">{row.name}</p>
          {row.status === "needs-review" && (
            <p className="text-muted-foreground text-xs">
              Nicht eindeutig — bitte manuell prüfen
            </p>
          )}
          {row.status === "failed" && (
            <p className="text-destructive text-xs">{row.error}</p>
          )}
          {row.searchedTitle && (
            <p className="text-muted-foreground text-xs">
              Gesucht als: {row.searchedTitle}
            </p>
          )}
          {(row.candidates?.length ?? 0) > 0 && (
            <div className="mt-1.5 flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">
                Auswahl zur Korrektur:
              </p>
              {row.candidates?.map((candidate) => {
                const details = candidateDetails[candidate.bggId];
                const authorAndPublisher = [
                  details?.author?.length ? details.author.join(", ") : null,
                  details?.publisher?.length
                    ? details.publisher.join(", ")
                    : null,
                ].filter(Boolean);
                return (
                  <div
                    key={candidate.bggId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-muted-foreground min-w-0">
                      <span className="block truncate">
                        {candidate.title}
                        {candidate.yearPublished
                          ? ` (${candidate.yearPublished})`
                          : ""}{" "}
                        — BGG-ID {candidate.bggId}
                      </span>
                      {authorAndPublisher.length > 0 && (
                        <span className="block truncate">
                          {authorAndPublisher.join(" · ")}
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={resolvingName === row.name}
                      onClick={() =>
                        onResolveCandidate(row.name, candidate.bggId)
                      }
                    >
                      {resolvingName === row.name
                        ? "Übernehme …"
                        : "Übernehmen"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {row.status === "needs-review" && row.candidates.length === 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              Kein BGG-Treffer — Titel/EAN prüfen oder manuell anlegen.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

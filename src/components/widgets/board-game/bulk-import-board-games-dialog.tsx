"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { BulkScanDialog } from "@/components/ui/bulk-scan-dialog";
import { BulkImportResultReport } from "@/components/widgets/board-game/bulk-import-result-report";
import {
  bulkImportBoardGames,
  fetchBulkImportCandidateDetails,
  resolveBulkImportCandidate,
  type BulkImportCandidateDetails,
  type BulkImportRow,
} from "@/lib/ludothek/board-games-bulk-import";
import { parseBulkImportCsv } from "@/lib/ludothek/bulk-import-csv";
import { mergeBulkImportEntries } from "@/lib/ludothek/bulk-import-entries";

/**
 * Massenimport mehrerer Titel per Namensliste (#186) — jede Zeile wird
 * einzeln gegen BGGs exakte Namenssuche aufgelöst (siehe
 * `bulkImportBoardGames`). Anders als der einzelne "Spiel anlegen"-Dialog
 * bleibt dieser nach dem Import offen und zeigt die Ergebnisübersicht statt
 * sich zu schließen — es gibt keine Einzel-Vorschau zum Korrigieren.
 */
export function BulkImportBoardGamesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [namesText, setNamesText] = useState("");
  const [fileFieldKey, setFileFieldKey] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<BulkImportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvingName, setResolvingName] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<
    Record<number, BulkImportCandidateDetails>
  >({});

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setNamesText("");
      setFileFieldKey((key) => key + 1);
      setResults(null);
      setError(null);
      setCandidateDetails({});
    }
  }

  /** Shared by the scanner and the CSV upload — both only add to the
   * existing list, never replace it, and never add an entry twice (#186-Folge). */
  function addEntries(entries: string[]) {
    setNamesText((current) =>
      mergeBulkImportEntries(
        current.split("\n").filter((line) => line.trim()),
        entries,
      ).join("\n"),
    );
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    addEntries(parseBulkImportCsv(text));
  }

  async function handleImport() {
    setIsImporting(true);
    setError(null);
    try {
      const result = await bulkImportBoardGames(namesText.split("\n"));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setResults(result.results);
      router.refresh();

      // Best-effort, nicht blockierend — Autor/Verlag ergänzen die
      // Kandidatenliste, sobald sie da sind, statt "Importieren" künstlich
      // zu verlängern (#186-Folge).
      const candidateBggIds = result.results.flatMap((row) =>
        row.status === "needs-review" || row.status === "failed"
          ? (row.candidates?.map((candidate) => candidate.bggId) ?? [])
          : [],
      );
      if (candidateBggIds.length > 0) {
        void fetchBulkImportCandidateDetails(candidateBggIds).then(
          setCandidateDetails,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Massenimport ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  /** Resolves one "Nicht importiert"-row by hand once the admin picks a
   * candidate — replaces just that row in place, no full re-run (#186-Folge). */
  async function handleResolveCandidate(name: string, bggId: number) {
    setResolvingName(name);
    try {
      const updated = await resolveBulkImportCandidate(name, bggId);
      setResults(
        (current) =>
          current?.map((row) => (row.name === name ? updated : row)) ?? current,
      );
      router.refresh();
    } finally {
      setResolvingName(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Upload className="size-4" />
            Massenimport
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mehrere Titel importieren</DialogTitle>
          <DialogDescription>
            Ein Spieletitel oder eine EAN pro Zeile — per Hand eintragen, EANs
            scannen oder eine CSV hochladen (mit oder ohne Kopfzeile, eine oder
            mehrere Spalten). Eindeutig auflösbare Einträge werden automatisch
            angelegt; alles andere (0 oder mehrere BGG-Treffer, bereits
            vorhanden, Fehler) landet zur manuellen Prüfung in der
            Ergebnisliste. Jeder Eintrag wird nur einmal importiert, auch bei
            mehrfachem Scan oder überlappenden Quellen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {!results && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <BulkScanDialog
                  disabled={isImporting}
                  onDetected={(text) => addEntries([text])}
                />
                <FileField
                  key={fileFieldKey}
                  id="bulk-import-csv"
                  label="CSV hochladen"
                  accept=".csv,text/csv"
                  disabled={isImporting}
                  onFilesSelected={(files) => {
                    const file = files[0];
                    if (file) void handleCsvFile(file);
                  }}
                />
              </div>
              <div className="relative">
                <TextAreaField
                  id="bulk-import-names"
                  label="Spieletitel oder EAN"
                  value={namesText}
                  onChange={(event) => setNamesText(event.target.value)}
                  placeholder={"Ark Nova\nWingspan\n4001504311896"}
                  rows={8}
                  readOnly={isImporting}
                />
                {isImporting && (
                  <div className="bg-background/80 absolute inset-0 top-6 flex flex-col items-center justify-center gap-2 rounded-md">
                    <Loader2 className="text-primary size-6 animate-spin" />
                    <p className="text-muted-foreground text-sm">
                      Importiere …
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          {results && (
            <BulkImportResultReport
              results={results}
              resolvingName={resolvingName}
              candidateDetails={candidateDetails}
              onResolveCandidate={handleResolveCandidate}
            />
          )}
        </div>

        <DialogFooter>
          {results ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Schließen
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isImporting || !namesText.trim()}
              onClick={handleImport}
            >
              {isImporting ? "Importiere…" : "Importieren"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

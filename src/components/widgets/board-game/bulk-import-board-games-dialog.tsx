"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import {
  bulkImportBoardGames,
  type BulkImportRow,
} from "@/lib/ludothek/board-games-bulk-import";

const STATUS_LABELS: Record<BulkImportRow["status"], string> = {
  imported: "Importiert",
  "skipped-duplicate": "Übersprungen — bereits im Bestand",
  "needs-review": "Nicht eindeutig — bitte manuell prüfen",
  failed: "Fehlgeschlagen",
};

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
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<BulkImportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setNamesText("");
      setResults(null);
      setError(null);
    }
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
            Ein Spieletitel pro Zeile. Eindeutig auflösbare Namen werden
            automatisch angelegt; alles andere (0 oder mehrere BGG-Treffer,
            bereits vorhanden, Fehler) landet zur manuellen Prüfung in der
            Ergebnisliste.
          </DialogDescription>
        </DialogHeader>

        {!results && (
          <TextAreaField
            id="bulk-import-names"
            label="Spieletitel"
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            placeholder={"Ark Nova\nWingspan\nDie Siedler von Catan"}
            rows={8}
          />
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {results && (
          <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            {results.map((row) => (
              <div key={row.name} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{row.name}</p>
                <p className="text-muted-foreground text-xs">
                  {STATUS_LABELS[row.status]}
                </p>
                {row.status === "needs-review" && row.candidates.length > 0 && (
                  <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
                    {row.candidates.map((candidate) => (
                      <li key={candidate.bggId}>
                        {candidate.title}
                        {candidate.yearPublished
                          ? ` (${candidate.yearPublished})`
                          : ""}{" "}
                        — BGG-ID {candidate.bggId}
                      </li>
                    ))}
                  </ul>
                )}
                {row.status === "failed" && (
                  <p className="text-destructive mt-1 text-xs">{row.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

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

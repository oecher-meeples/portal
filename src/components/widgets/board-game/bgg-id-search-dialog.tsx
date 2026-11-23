"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";
import { searchBggGamesAction } from "@/lib/ludothek/board-games-bgg-import";
import type { BggSearchResult } from "@/lib/bgg/client";

/**
 * Namenssuche-Dialog fürs leere BGG-ID-Feld (#206) — analog
 * `ExplainerVideoSearchDialog`: Lupen-Icon → Dialog mit Tabelle der Treffer
 * (Titel, Jahr) → Auswahl per Doppelklick oder Klick + "Übernehmen" setzt nur
 * die BGG-ID ins Feld, kein voller Import.
 */
export function BggIdSearchDialog({
  title,
  onSelect,
}: {
  title: string;
  onSelect: (bggId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || !title.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setSelectedId(null);
    try {
      const result = await searchBggGamesAction(title);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.results.length === 0) {
        setError("Keine Treffer auf BoardGameGeek gefunden.");
        return;
      }
      setResults(result.results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die BGG-Suche ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirm(bggId: number) {
    onSelect(String(bggId));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="BGG-ID per Namenssuche finden"
            disabled={!title.trim()}
          >
            <SearchIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>BGG-ID auswählen</DialogTitle>
          <DialogDescription>
            Treffer für „{title}“ auf BoardGameGeek.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-muted-foreground text-sm">Suche…</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Titel</th>
                  <th className="px-3 py-2 font-medium">Jahr</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.bggId}
                    onClick={() => setSelectedId(result.bggId)}
                    onDoubleClick={() => handleConfirm(result.bggId)}
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground cursor-pointer border-t",
                      selectedId === result.bggId &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <td className="px-3 py-2">{result.title}</td>
                    <td className="px-3 py-2">{result.yearPublished ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={selectedId === null}
            onClick={() => selectedId !== null && handleConfirm(selectedId)}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

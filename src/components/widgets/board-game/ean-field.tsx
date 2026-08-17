"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { searchEanForBoardGame } from "@/lib/ludothek/ean-search";
import type { EanSearchResult } from "@/lib/upc-lookup/client";

/** Sucht der Reihe nach mit jedem Titel, bis einer Treffer liefert (#197-
 * Folgeanfrage) — z. B. wenn der (meist englische) Haupttitel nichts findet,
 * aber ein deutscher Alternativname von BGG durchaus im Handel gelistet ist.
 * Bricht bei einem echten API-Fehler sofort ab, statt ihn für jeden weiteren
 * Titel zu wiederholen. */
async function searchWithFallback(titles: string[]) {
  for (const candidate of titles) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const result = await searchEanForBoardGame(trimmed);
    if (!result.success) return result;
    if (result.results.length > 0) return result;
  }
  return { success: true as const, results: [] as EanSearchResult[] };
}

/** The EAN input plus its scan icon — shared by every place a BoardGame's
 * EAN is edited (create/edit dialogs, manual and BGG mode, see #121/#122).
 * Lupen-Icon sucht zusätzlich per Titel nach einer EAN (#197) — kein
 * verlässlicher Volltreffer (siehe `searchEanByName`), deshalb bei >1
 * Treffer eine Auswahlliste statt Auto-Fill, bei 0 nur ein Hinweis. */
export function EanField({
  idPrefix,
  value,
  onChange,
  fieldClassName,
  title,
  autoSearchOnMount,
  alternateTitles,
}: {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
  fieldClassName?: string;
  /** Grundlage für die EAN-Suche — ohne Titel bleibt der Such-Button
   * deaktiviert (#197). */
  title?: string;
  /** Löst beim ersten Rendern automatisch eine Suche aus, wenn `value` noch
   * leer ist — nur für Schritt 2 des Anlegen-Wizards (#197), niemals im
   * Titel-Editor, wo das überraschend wäre. */
  autoSearchOnMount?: boolean;
  /** BGGs Alternativnamen (#187) — liefert `title` keinen Treffer, wird der
   * Reihe nach mit jedem dieser Namen weitergesucht (#197-Folgeanfrage). */
  alternateTitles?: string[];
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<EanSearchResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function applyResults(results: EanSearchResult[]) {
    if (results.length === 0) {
      setMessage("Keine EAN gefunden.");
      setCandidates(null);
    } else if (results.length === 1) {
      onChange(results[0].ean);
      setMessage(null);
      setCandidates(null);
    } else {
      setCandidates(results);
      setMessage(null);
    }
  }

  async function handleSearch() {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) return;

    setIsSearching(true);
    setMessage(null);
    setCandidates(null);
    try {
      const result = await searchWithFallback([
        trimmedTitle,
        ...(alternateTitles ?? []),
      ]);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      applyResults(result.results);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Die EAN-Suche ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    const trimmedTitle = title?.trim();
    if (!autoSearchOnMount || value.trim() || !trimmedTitle) return;

    let cancelled = false;
    searchWithFallback([trimmedTitle, ...(alternateTitles ?? [])]).then(
      (result) => {
        if (cancelled) return;
        if (!result.success) {
          setMessage(result.error);
          return;
        }
        applyResults(result.results);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- läuft nur einmal beim Mount, d. h. genau beim Wechsel zu Schritt 2 (#197)
  }, []);

  return (
    <Field
      label="EAN"
      htmlFor={`${idPrefix}-ean`}
      hint="Mehrere Spiele desselben Titels dürfen dieselbe EAN tragen."
      className={fieldClassName}
    >
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-ean`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="optional, vom Barcode auf der Schachtel"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="EAN zum Titel suchen"
          disabled={isSearching || !title?.trim()}
          onClick={handleSearch}
        >
          <SearchIcon className="size-4" />
        </Button>
        <ScanSearchDialog onScanned={onChange} />
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
      {candidates && candidates.length > 0 && (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-1">
          {candidates.map((candidate) => (
            <li key={candidate.ean}>
              <button
                type="button"
                className="hover:bg-accent hover:text-accent-foreground group w-full rounded px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  onChange(candidate.ean);
                  setCandidates(null);
                }}
              >
                {candidate.title}
                {candidate.brand && (
                  <span className="text-muted-foreground group-hover:text-accent-foreground/80">
                    {" "}
                    ({candidate.brand})
                  </span>
                )}
                <span className="text-muted-foreground group-hover:text-accent-foreground/80">
                  {" "}
                  — {candidate.ean}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { normaliseEan } from "@/lib/inventory/ean";
import { searchEanForBoardGame } from "@/lib/ludothek/ean-search";
import type { EanSearchResult } from "@/lib/upc-lookup/client";

type SearchOptions = {
  bggProductCode?: string | null;
  publisher?: string[];
  excludeBoardGameId?: string;
};

/** Sucht der Reihe nach mit jedem Titel, bis einer Treffer liefert (#197-
 * Folgeanfrage) — z. B. wenn der (meist englische) Haupttitel nichts findet,
 * aber ein deutscher Alternativname von BGG durchaus im Handel gelistet ist.
 * Bricht bei einem echten API-Fehler sofort ab, statt ihn für jeden weiteren
 * Titel zu wiederholen. */
async function searchWithFallback(titles: string[], options?: SearchOptions) {
  for (const candidate of titles) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const result = await searchEanForBoardGame(trimmed, options);
    if (!result.success) return result;
    if (result.results.length > 0) return result;
  }
  return { success: true as const, results: [] as EanSearchResult[] };
}

/** The EAN list of a title (one EAN per edition) with add/remove, scan and
 * title search (#197, #668). The search suggests several editions at once —
 * the user ticks any number of them; EANs already owned by another title are
 * shown but not selectable. */
export function EanField({
  idPrefix,
  values,
  onChange,
  fieldClassName,
  title,
  autoSearchOnMount,
  alternateTitles,
  bggProductCode,
  publisherForSorting,
  boardGameId,
}: {
  idPrefix: string;
  values: string[];
  onChange: (values: string[]) => void;
  fieldClassName?: string;
  /** Grundlage für die EAN-Suche — ohne Titel bleibt der Such-Button
   * deaktiviert (#197). */
  title?: string;
  /** Löst beim ersten Rendern automatisch eine Suche aus, wenn noch keine EAN
   * hinterlegt ist — nur für Schritt 2 des Anlegen-Wizards (#197), niemals im
   * Titel-Editor, wo das überraschend wäre. */
  autoSearchOnMount?: boolean;
  /** BGGs Alternativnamen (#187) — liefert `title` keinen Treffer, wird der
   * Reihe nach mit jedem dieser Namen weitergesucht (#197-Folgeanfrage). */
  alternateTitles?: string[];
  /** Eindeutiger BGG-Product-Code über die (ggf. deutschen) Versionen (#205)
   * — hat Vorrang vor der Titelsuche, siehe `searchEanForBoardGame()`. */
  bggProductCode?: string | null;
  /** Sortiert Kandidaten mit passendem `brand` nach oben (#205) — greift nur,
   * wenn kein `bggProductCode` vorliegt. */
  publisherForSorting?: string[];
  /** Titel im Editor: seine eigenen EANs gelten in den Vorschlägen nicht als vergeben. */
  boardGameId?: string;
}) {
  const [draft, setDraft] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<EanSearchResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function addEans(added: string[]) {
    const next = [...values];
    for (const raw of added) {
      const ean = normaliseEan(raw);
      if (ean && !next.includes(ean)) next.push(ean);
    }
    onChange(next);
  }

  function toggleCandidate(ean: string, checked: boolean) {
    onChange(
      checked ? [...values, ean] : values.filter((value) => value !== ean),
    );
  }

  function handleAddDraft() {
    if (!draft.trim()) return;
    addEans([draft]);
    setDraft("");
  }

  function applyResults(results: EanSearchResult[]) {
    setCandidates(null);
    const available = results.filter((result) => !result.takenBy);
    if (results.length === 0) {
      setMessage("Keine EAN gefunden.");
    } else if (results.length === 1 && available.length === 1) {
      addEans([available[0].ean]);
      setMessage(null);
    } else {
      setCandidates(results);
      setMessage(null);
    }
  }

  async function runSearch(trimmedTitle: string) {
    const result = await searchWithFallback(
      [trimmedTitle, ...(alternateTitles ?? [])],
      {
        bggProductCode,
        publisher: publisherForSorting,
        excludeBoardGameId: boardGameId,
      },
    );
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    applyResults(result.results);
  }

  async function handleSearch() {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) return;

    setIsSearching(true);
    setMessage(null);
    setCandidates(null);
    try {
      await runSearch(trimmedTitle);
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
    if (!autoSearchOnMount || values.length > 0 || !trimmedTitle) return;

    let cancelled = false;
    searchWithFallback([trimmedTitle, ...(alternateTitles ?? [])], {
      bggProductCode,
      publisher: publisherForSorting,
      excludeBoardGameId: boardGameId,
    }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      applyResults(result.results);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- läuft nur einmal beim Mount, d. h. genau beim Wechsel zu Schritt 2 (#197)
  }, []);

  return (
    <Field
      label="EANs"
      htmlFor={`${idPrefix}-ean`}
      hint="Eine EAN je Edition. Jede EAN gehört genau einem Titel."
      className={fieldClassName}
    >
      {values.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Hinterlegte EANs">
          {values.map((ean) => (
            <li
              key={ean}
              className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <span className="font-mono">{ean}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                aria-label={`EAN ${ean} entfernen`}
                onClick={() =>
                  onChange(values.filter((value) => value !== ean))
                }
              >
                <XIcon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-ean`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddDraft();
            }
          }}
          placeholder="EAN vom Barcode auf der Schachtel"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="EAN hinzufügen"
          disabled={!draft.trim()}
          onClick={handleAddDraft}
        >
          <PlusIcon className="size-4" />
        </Button>
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
        <ScanSearchDialog onScanned={(text) => addEans([text])} />
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
      {candidates && candidates.length > 0 && (
        <fieldset className="flex flex-col gap-1 rounded-md border p-2">
          <legend className="text-muted-foreground px-1 text-xs">
            {candidates.length} EAN-Vorschläge — beliebig viele auswählen
          </legend>
          {candidates.map((candidate) => (
            <label
              key={candidate.ean}
              className="flex items-start gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={values.includes(candidate.ean)}
                disabled={Boolean(candidate.takenBy)}
                onChange={(event) =>
                  toggleCandidate(candidate.ean, event.target.checked)
                }
              />
              <span>
                {candidate.title}
                {candidate.year ? ` · ${candidate.year}` : ""}
                {candidate.brand ? ` (${candidate.brand})` : ""} —{" "}
                {candidate.ean}
                {candidate.takenBy && (
                  <span className="text-destructive block text-xs">
                    Bereits vergeben an „{candidate.takenBy}“
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </Field>
  );
}

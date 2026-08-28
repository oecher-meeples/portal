"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoverMedia } from "@/components/ui/cover-media";
import { TextField, TextAreaField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import {
  fetchOwnBggForTradeEntries,
  createMarketListingFromBgg,
  type BggForTradeEntry,
} from "@/components/feature/markt/bgg-import-actions";

/** Zweistufiger Dialog (#275): erst die eigene BGG-"for trade"-Liste, dann
 * je gewähltem Eintrag ein kleines Formular für Beschreibung/Preis/Zustand
 * — Titel und Bild kommen unveränderlich aus BGG. Bewusst kein `ActionDialog`
 * (der kennt nur einen Submit-Schritt), aber `useAction` für die
 * Pending/Error-Bookkeeping des eigentlichen Anlegens. */
export function ImportBggListingDialog({
  ownListingTitles,
}: {
  ownListingTitles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<BggForTradeEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<BggForTradeEntry | null>(null);
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [condition, setCondition] = useState("");

  const { run, pending, error } = useAction({
    onSuccess: () => handleOpenChange(false),
  });

  function reset() {
    setEntries(null);
    setLoadError(null);
    setSelected(null);
    setDescription("");
    setPriceEuros("");
    setCondition("");
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      return;
    }
    setIsLoading(true);
    const result = await fetchOwnBggForTradeEntries();
    setIsLoading(false);
    if ("error" in result) {
      setLoadError(result.error);
      return;
    }
    setEntries(result.entries);
  }

  function isDuplicate(title: string) {
    return ownListingTitles.some(
      (existing) => existing.toLowerCase() === title.toLowerCase(),
    );
  }

  function handleSubmit() {
    if (!selected) return;
    void run(() =>
      createMarketListingFromBgg({
        bggId: selected.bggId,
        title: selected.title,
        imageUrl: selected.imageUrl,
        description,
        priceEuros: Number(priceEuros),
        condition,
      }),
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        BGG for trade importieren
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? "Anzeige erstellen" : "BGG for trade importieren"}
            </DialogTitle>
          </DialogHeader>

          {!selected && (
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {isLoading && (
                <p className="text-muted-foreground text-sm">
                  Lade deine BGG-Collection…
                </p>
              )}
              {loadError && (
                <p className="text-destructive text-sm">{loadError}</p>
              )}
              {entries?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Keine „for trade“ markierten Spiele in deiner BGG-Collection
                  gefunden.
                </p>
              )}
              {entries?.map((entry) => (
                <div
                  key={entry.bggId}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
                  <CoverMedia
                    imageUrl={entry.imageUrl}
                    alt={entry.title}
                    aspect="aspect-square"
                    fit="contain"
                    className="size-14 shrink-0"
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{entry.title}</span>
                    {isDuplicate(entry.title) && (
                      <span className="text-xs text-amber-600">
                        Du hast bereits eine Anzeige mit diesem Titel.
                      </span>
                    )}
                  </div>
                  <Button size="sm" onClick={() => setSelected(entry)}>
                    Anzeige erstellen
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <CoverMedia
                  imageUrl={selected.imageUrl}
                  alt={selected.title}
                  aspect="aspect-square"
                  fit="contain"
                  className="size-16 shrink-0"
                />
                <span className="font-serif font-semibold">
                  {selected.title}
                </span>
              </div>
              <TextField
                id="bgg-listing-price"
                label="Preis (€)"
                type="number"
                min={0}
                step={1}
                value={priceEuros}
                onChange={(event) => setPriceEuros(event.target.value)}
                required
              />
              <TextField
                id="bgg-listing-condition"
                label="Zustand"
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                required
              />
              <TextAreaField
                id="bgg-listing-description"
                label="Beschreibung"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Zurück
                </Button>
                <Button
                  disabled={pending || !condition.trim() || !priceEuros}
                  onClick={handleSubmit}
                >
                  {pending ? "Speichere…" : "Anzeige erstellen"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

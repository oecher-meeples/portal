"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { useAction } from "@/components/ui/use-action";
import {
  addAlternateName,
  clearSecondaryTitle,
  deleteAlternateName,
  listAlternateNames,
  promoteAlternateNameToSecondaryTitle,
  promoteAlternateNameToTitle,
  swapTitleAndSecondaryTitle,
} from "@/lib/ludothek/board-game-alternate-names";

type AlternateName = { id: string; name: string; note: string | null };

/**
 * Übersicht und Verwaltung aller Titel-Varianten (#203, #203-Folge): jede
 * Zeile — Haupttitel, Sekundärtitel (falls gesetzt) und alle Alternativnamen
 * — bietet "Als Haupttitel verwenden" bzw. "Als Sekundärtitel verwenden".
 * Beide Aktionen tauschen nur Werte (nie Datenverlust, siehe die einzelnen
 * Server Actions), die aufrufenden Callbacks halten das umgebende
 * Titel-Formular synchron, damit ein späteres "Speichern" dort keine
 * inzwischen veralteten Werte zurückschreibt.
 */
export function TitleOverviewDialog({
  boardGameId,
  title,
  secondaryTitle,
  onTitleChange,
  onSecondaryTitleChange,
}: {
  boardGameId: string;
  title: string;
  secondaryTitle: string;
  onTitleChange: (title: string) => void;
  onSecondaryTitleChange: (secondaryTitle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<AlternateName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    const result = await listAlternateNames(boardGameId);
    if (!result.success) {
      setLoadError(result.error);
      return;
    }
    setNames(result.alternateNames);
    setLoadError(null);
  }, [boardGameId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listAlternateNames(boardGameId).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setLoadError(result.error);
        setIsLoading(false);
        return;
      }
      setNames(result.alternateNames);
      setLoadError(null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, boardGameId]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setIsLoading(true);
      setLoadError(null);
    }
  }

  const {
    run: runAdd,
    pending: isAdding,
    error: addError,
  } = useAction({
    refresh: false,
    onSuccess: () => setNewName(""),
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    await runAdd(() => addAlternateName(boardGameId, newName));
    await refresh();
  }

  async function handleSwapWithSecondary() {
    const result = await swapTitleAndSecondaryTitle(boardGameId);
    if ("success" in result) {
      onTitleChange(secondaryTitle);
      onSecondaryTitleChange(title);
    }
    return result;
  }

  async function handlePromoteAlternateToTitle(alt: AlternateName) {
    const result = await promoteAlternateNameToTitle(alt.id);
    if ("success" in result) {
      onTitleChange(alt.name);
      await refresh();
    }
    return result;
  }

  async function handlePromoteAlternateToSecondary(alt: AlternateName) {
    const result = await promoteAlternateNameToSecondaryTitle(alt.id);
    if ("success" in result) {
      onSecondaryTitleChange(alt.name);
      await refresh();
    }
    return result;
  }

  async function handleClearSecondary() {
    const result = await clearSecondaryTitle(boardGameId);
    if ("success" in result) {
      onSecondaryTitleChange("");
    }
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="size-4" />
            Alternativtitel
          </Button>
        }
      />
      <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alle Titel</DialogTitle>
          <DialogDescription>
            Haupttitel, Sekundärtitel und alle Alternativtitel dieses Spiels —
            jede Zeile kann zum Haupt- oder Sekundärtitel werden.
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-destructive text-sm">{loadError}</p>}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Lade…</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex flex-col gap-1.5 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {title}
                <span className="text-muted-foreground"> (Haupttitel)</span>
              </span>
              <ActionButton
                size="sm"
                variant="outline"
                disabled={!secondaryTitle}
                action={handleSwapWithSecondary}
              >
                Als Sekundärtitel verwenden
              </ActionButton>
            </li>

            {secondaryTitle && (
              <li className="flex flex-col gap-1.5 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {secondaryTitle}
                  <span className="text-muted-foreground">
                    {" "}
                    (Sekundärtitel)
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ActionButton
                    size="sm"
                    variant="outline"
                    action={handleSwapWithSecondary}
                  >
                    Als Haupttitel verwenden
                  </ActionButton>
                  <ActionButton
                    size="icon-sm"
                    variant="outline"
                    className="text-destructive"
                    aria-label="Sekundärtitel entfernen"
                    confirm="Sekundärtitel wirklich entfernen?"
                    action={handleClearSecondary}
                  >
                    <Trash2 className="size-4" />
                  </ActionButton>
                </div>
              </li>
            )}

            {names.map((alt) => (
              <li
                key={alt.id}
                className="flex flex-col gap-1.5 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {alt.name}
                  {alt.note && (
                    <span className="text-muted-foreground"> ({alt.note})</span>
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ActionButton
                    size="sm"
                    variant="outline"
                    action={() => handlePromoteAlternateToTitle(alt)}
                  >
                    Als Haupttitel verwenden
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="outline"
                    action={() => handlePromoteAlternateToSecondary(alt)}
                  >
                    Als Sekundärtitel verwenden
                  </ActionButton>
                  <ActionButton
                    size="icon-sm"
                    variant="outline"
                    className="text-destructive"
                    aria-label={`„${alt.name}“ löschen`}
                    confirm={`„${alt.name}“ wirklich löschen?`}
                    action={() => deleteAlternateName(alt.id)}
                    onSuccess={refresh}
                  >
                    <Trash2 className="size-4" />
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Neuer Alternativname"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isAdding || !newName.trim()}
              onClick={handleAdd}
            >
              {isAdding ? "Speichere…" : "Hinzufügen"}
            </Button>
          </div>
          {addError && <p className="text-destructive text-xs">{addError}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

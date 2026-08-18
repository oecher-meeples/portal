"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { useAction } from "@/components/ui/use-action";
import {
  addAlternateName,
  deleteAlternateName,
  promoteAlternateNameToTitle,
  listAlternateNames,
} from "@/lib/ludothek/board-game-alternate-names";

type AlternateName = { id: string; name: string; note: string | null };

/**
 * Verwaltung der Alternativnamen eines Titels (#187) — lädt sich selbst,
 * unabhängig vom umgebenden Dialog, ähnlich `ExplainerVideoSearchDialog".
 * "Als Hauptname übernehmen" tauscht nur Werte (siehe
 * `promoteAlternateNameToTitle`), die Zeile bleibt bestehen. Die frühere
 * Sekundärname-Markierung ist durch `BoardGame.secondaryTitle` ersetzt (#203)
 * — dieser Manager kennt sie nicht mehr.
 */
export function AlternateNamesManager({
  boardGameId,
}: {
  boardGameId: string;
}) {
  const [names, setNames] = useState<AlternateName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    const result = await listAlternateNames(boardGameId);
    if (!result.success) {
      setLoadError(result.error);
      setIsLoading(false);
      return;
    }
    setNames(result.alternateNames);
    setLoadError(null);
    setIsLoading(false);
  }, [boardGameId]);

  useEffect(() => {
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
  }, [boardGameId]);

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

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Alternativnamen</p>
      {loadError && <p className="text-destructive text-xs">{loadError}</p>}

      {isLoading ? (
        <p className="text-muted-foreground text-xs">Lade…</p>
      ) : names.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Keine Alternativnamen hinterlegt.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {names.map((alt) => (
            <li
              key={alt.id}
              className="flex flex-col gap-1.5 rounded-md border p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
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
                  action={() => promoteAlternateNameToTitle(alt.id)}
                  onSuccess={refresh}
                >
                  Als Hauptname übernehmen
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
    </div>
  );
}

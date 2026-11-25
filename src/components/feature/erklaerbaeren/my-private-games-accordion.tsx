"use client";

import { useMemo, useState } from "react";
import { CountAccordionCard } from "@/components/ui/count-accordion-card";
import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { useAction } from "@/components/ui/use-action";
import { ExplainerLevelToggle } from "@/components/entities/explainer-level-toggle";
import { addExplainerGame, removeExplainerGame } from "@/lib/explainer/actions";
import type { OwnPrivateGameExplainerEntry } from "@/lib/explainer/queries";

/**
 * Eigene BGG-Spiele (Privatsammlung) als Akkordeon mit Niveau-Auswahl je
 * Spiel (#654) — spart das Durchsuchen der Ludothek. Ein Klick auf eine Stufe
 * trägt das Spiel als Erklärbär-Eintrag ein bzw. ändert die Stufe, erneutes
 * Klicken der aktiven Stufe entfernt den Eintrag wieder.
 */
export function MyPrivateGamesAccordion({
  games,
}: {
  games: OwnPrivateGameExplainerEntry[];
}) {
  const [filter, setFilter] = useState("");
  const { run, pending, error } = useAction();

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return games;
    return games.filter((game) =>
      game.boardGameTitle.toLowerCase().includes(term),
    );
  }, [games, filter]);

  if (games.length === 0) return null;

  return (
    <CountAccordionCard count={games.length} label="Meine Spiele aus BGG">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Wähle ein Niveau, um ein Spiel als Erklärbär einzutragen. Die aktive
          Stufe erneut anklicken entfernt den Eintrag.
        </p>
        <TextField
          id="private-explainer-filter"
          label="Spiele filtern"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onClear={() => setFilter("")}
          placeholder="Spielname …"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Kein Spiel passt zum Filter.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {filtered.map((game) => (
            <li
              key={game.boardGameId}
              className={cn(
                "flex flex-col gap-1.5 rounded-md border p-2",
                game.isExpansion && "ml-4",
              )}
            >
              <span className="font-medium">
                {game.boardGameTitle}
                {game.isExpansion && (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    Erweiterung
                  </span>
                )}
              </span>
              <ExplainerLevelToggle
                value={game.level}
                disabled={pending}
                onChange={(level) =>
                  run(() => addExplainerGame(game.boardGameId, level))
                }
                onDeselect={() =>
                  run(() => removeExplainerGame(game.boardGameId))
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </CountAccordionCard>
  );
}

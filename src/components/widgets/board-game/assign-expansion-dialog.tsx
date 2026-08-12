"use client";

import { useState } from "react";
import type { BoardGameKind } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  assignExpansion,
  removeExpansionAssignment,
} from "@/lib/ludothek/board-games";

export type GameOption = { id: string; title: string };

/**
 * Manual base game ↔ expansion assignment for `games:manage` holders — BGG
 * import is blocked by #12, so this is the only way to link them (#30).
 */
export function AssignExpansionDialog({
  game,
  linked,
  options,
}: {
  game: { id: string; kind: BoardGameKind };
  /** Already-linked base games (if `game` is an expansion) or expansions (if `game` is a base game). */
  linked: GameOption[];
  /** Candidate games to link — excludes `game` itself and already-linked entries. */
  options: GameOption[];
}) {
  const [selected, setSelected] = useState("");
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";

  return (
    <div className="flex flex-col gap-2">
      {linked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {linked.map((entry) => (
            <li key={entry.id} className="flex items-center gap-1">
              <span className="text-sm">{entry.title}</span>
              <ActionButton
                variant="ghost"
                size="sm"
                confirm={`"${entry.title}" wirklich entfernen?`}
                action={() =>
                  isExpansion
                    ? removeExpansionAssignment(entry.id, game.id)
                    : removeExpansionAssignment(game.id, entry.id)
                }
              >
                Entfernen
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      <ActionDialog
        trigger={
          <Button variant="outline" size="sm">
            {isExpansion ? "Basisspiel zuordnen" : "Erweiterung hinzufügen"}
          </Button>
        }
        title={isExpansion ? "Basisspiel zuordnen" : "Erweiterung hinzufügen"}
        submitLabel="Zuordnen"
        canSubmit={selected !== ""}
        action={() =>
          isExpansion
            ? assignExpansion(selected, game.id)
            : assignExpansion(game.id, selected)
        }
        onReset={() => setSelected("")}
      >
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">— Spiel wählen —</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </ActionDialog>
    </div>
  );
}

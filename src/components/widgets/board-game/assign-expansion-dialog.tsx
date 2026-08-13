"use client";

import { useState } from "react";
import type { BoardGameKind } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { assignExpansion } from "@/lib/ludothek/board-games";

export type GameOption = { id: string; title: string };

/**
 * Manual base game ↔ expansion assignment trigger for `games:manage`
 * holders — BGG import is blocked by #12, so this is the only way to link
 * them (#30). Just the trigger + dialog; removing an existing assignment
 * happens on the `RelatedGameCard` itself (Plan-Schritt 4/5), not here.
 */
export function AssignExpansionDialog({
  game,
  options,
}: {
  game: { id: string; kind: BoardGameKind };
  /** Candidate games to link — excludes `game` itself and already-linked entries. */
  options: GameOption[];
}) {
  const [selected, setSelected] = useState("");
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";

  return (
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
  );
}

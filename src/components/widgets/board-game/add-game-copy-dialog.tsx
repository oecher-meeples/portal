"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import {
  EMPTY_BOARD_GAME_FORM,
  exemplarFormToCopyInput,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";
import {
  createGameCopy,
  getSuggestedInventoryNumber,
} from "@/lib/ludothek/game-copies";

/**
 * Adds another physical copy to an existing title — the "weiteres Exemplar"
 * flow (see ADR 0008). No BGG/title fields here, those already exist on the
 * title; only the new copy's own condition and Regelheft-Sprache(n) are
 * asked for (#188, #203-Folge — vorher nur nachträglich im Exemplar-Editor
 * erfassbar, obwohl eine Schachtel oft schon beim Einräumen bekannt ist).
 */
export function AddGameCopyDialog({
  boardGameId,
  boardGameTitle,
  open,
  onOpenChange,
}: {
  boardGameId: string;
  boardGameTitle: string;
  /** Von außen gesteuert (z. B. aus `GameActionsMenu`) — dann ohne eigenen
   * Trigger-Button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [form, setForm] = useState<BoardGameFormValues>(EMPTY_BOARD_GAME_FORM);
  const [inventoryNumber, setInventoryNumber] = useState("");

  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button variant="ghost" size="sm">
            <CopyPlus className="size-4" />
            Weiteres Exemplar
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title={`Weiteres Exemplar von „${boardGameTitle}“ anlegen`}
      description="Das neue Exemplar liegt zunächst in „Unsortiert“ — Standort per Scan einlagern."
      submitLabel="Anlegen"
      contentClassName="sm:max-w-2xl"
      onOpen={async () => {
        setInventoryNumber(await getSuggestedInventoryNumber());
      }}
      action={() =>
        createGameCopy(
          boardGameId,
          exemplarFormToCopyInput(form, inventoryNumber),
        )
      }
      onReset={() => {
        setForm(EMPTY_BOARD_GAME_FORM);
        setInventoryNumber("");
      }}
    >
      <TextField
        id={`add-copy-${boardGameId}-inventory-number`}
        label="Inventarnummer"
        value={inventoryNumber}
        onChange={(event) => setInventoryNumber(event.target.value)}
      />
      <EditBoardGameExemplar
        idPrefix={`add-copy-${boardGameId}`}
        values={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        boardGameId={boardGameId}
      />
    </ActionDialog>
  );
}

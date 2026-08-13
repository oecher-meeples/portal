"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { updateGameCopy } from "@/lib/ludothek/game-copies";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

/** Edits one physical copy's condition — the counterpart to
 * `EditBoardGameTitleDialog`, scoped to a single `GameCopy` (see ADR 0008). */
export function EditBoardGameExemplarDialog({
  copyId,
  condition,
}: {
  copyId: string;
  condition: string | null;
}) {
  const [value, setValue] = useState(condition ?? "");

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="ghost">
          <Pencil className="size-4" />
          Bearbeiten
        </Button>
      }
      title="Exemplar bearbeiten"
      submitLabel="Speichern"
      action={() => updateGameCopy(copyId, { condition: value || undefined })}
      onReset={() => setValue(condition ?? "")}
    >
      <EditBoardGameExemplar
        idPrefix={`copy-${copyId}`}
        values={{ ...EMPTY_BOARD_GAME_FORM, condition: value }}
        onChange={(patch) => {
          if (patch.condition !== undefined) setValue(patch.condition);
        }}
      />
    </ActionDialog>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { updateGameCopy } from "@/lib/ludothek/game-copies";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

/** Edits one physical copy's condition (Mängelvermerk) — the counterpart to
 * `EditBoardGameTitleDialog`, scoped to a single `GameCopy` (see ADR 0008).
 * `triggerLabel` defaults to the exemplar-table's own "Bearbeiten" but is
 * overridden to "Mängelvermerk bearbeiten" where it sits in `GameActionsMenu`
 * next to the title-level "Bearbeiten" (Plan-Schritt 10). */
export function EditBoardGameExemplarDialog({
  copyId,
  condition,
  triggerLabel = "Bearbeiten",
  open,
  onOpenChange,
}: {
  copyId: string;
  condition: string | null;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [value, setValue] = useState(condition ?? "");

  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button size="sm" variant="outline">
            <Pencil className="size-4" />
            {triggerLabel}
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
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

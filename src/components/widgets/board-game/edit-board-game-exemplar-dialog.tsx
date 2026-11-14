"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { RuleBookLanguage } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { updateGameCopy } from "@/lib/ludothek/game-copies";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import {
  EMPTY_BOARD_GAME_FORM,
  editionSelectionFromForm,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";

/** Edits one physical copy's condition (Mängelvermerk) and Regelheft-Sprache(n)
 * (#188) — the counterpart to `EditBoardGameTitleDialog`, scoped to a single
 * `GameCopy` (see ADR 0008). `triggerLabel` defaults to the exemplar-table's
 * own "Bearbeiten" but is overridden to "Exemplar bearbeiten" where it sits in
 * `GameActionsMenu` next to the title-level "Bearbeiten" (Plan-Schritt 10) —
 * a label naming only the Mängelvermerk hid that Regelheft-Sprache(n) is
 * also editable here (#188-Folge). */
export function EditBoardGameExemplarDialog({
  copyId,
  condition,
  ruleBookLanguages,
  inventoryNumber,
  boardGameId,
  versionId,
  triggerLabel = "Bearbeiten",
  open,
  onOpenChange,
}: {
  copyId: string;
  condition: string | null;
  ruleBookLanguages: RuleBookLanguage[];
  /** Freie Inventarnummer des Exemplars (#270). */
  inventoryNumber?: string | null;
  /** Titel des Exemplars — liefert die zur Auswahl stehenden Editionen. */
  boardGameId?: string;
  /** Aktuelle Edition des Exemplars. */
  versionId?: string | null;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [value, setValue] = useState(condition ?? "");
  const [languages, setLanguages] = useState(ruleBookLanguages);
  const [inventoryNumberValue, setInventoryNumberValue] = useState(
    inventoryNumber ?? "",
  );

  const initialEdition = (): BoardGameFormValues => ({
    ...EMPTY_BOARD_GAME_FORM,
    editionMode: versionId ? "existing" : "none",
    editionVersionId: versionId ?? "",
  });
  const [edition, setEdition] = useState(initialEdition);

  function reset() {
    setEdition(initialEdition());
    setValue(condition ?? "");
    setLanguages(ruleBookLanguages);
    setInventoryNumberValue(inventoryNumber ?? "");
  }

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
      contentClassName="sm:max-w-2xl"
      submitLabel="Speichern"
      action={() =>
        updateGameCopy(copyId, {
          condition: value || undefined,
          ruleBookLanguages: languages,
          inventoryNumber: inventoryNumberValue,
          edition: editionSelectionFromForm(edition),
        })
      }
      onReset={reset}
    >
      <TextField
        id={`copy-${copyId}-inventory-number`}
        label="Inventarnummer"
        value={inventoryNumberValue}
        onChange={(event) => setInventoryNumberValue(event.target.value)}
      />
      <EditBoardGameExemplar
        idPrefix={`copy-${copyId}`}
        boardGameId={boardGameId}
        values={{
          ...edition,
          condition: value,
          ruleBookLanguages: languages,
        }}
        onChange={(patch) => {
          if (patch.condition !== undefined) setValue(patch.condition);
          if (patch.ruleBookLanguages !== undefined)
            setLanguages(patch.ruleBookLanguages);
          setEdition((prev) => ({ ...prev, ...patch }));
        }}
      />
    </ActionDialog>
  );
}

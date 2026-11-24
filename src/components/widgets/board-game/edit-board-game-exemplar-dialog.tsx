"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { RuleBookLanguage } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { InventoryNumberField } from "@/components/widgets/board-game/inventory-number-field";
import { updateGameCopy } from "@/lib/ludothek/game-copies";
import { valueCentsToInput } from "@/lib/ludothek/game-copy-acquisition";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import {
  EMPTY_BOARD_GAME_FORM,
  exemplarFormToCopyInput,
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
  valueCents,
  acquiredOn,
  boardGameId,
  versionId,
  triggerLabel = "Bearbeiten",
  open,
  onOpenChange,
}: {
  copyId: string;
  condition: string | null;
  ruleBookLanguages: RuleBookLanguage[];
  /** Inventarnummer des Exemplars (#270, ganzzahlig seit #543). */
  inventoryNumber?: number | null;
  /** Wert in Cent und „Erhalten am" (`JJJJ-MM-TT`), #615. */
  valueCents?: number | null;
  acquiredOn?: string | null;
  /** Titel des Exemplars — liefert die zur Auswahl stehenden Editionen. */
  boardGameId?: string;
  /** Aktuelle Edition des Exemplars. */
  versionId?: string | null;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const initialForm = (): BoardGameFormValues => ({
    ...EMPTY_BOARD_GAME_FORM,
    condition: condition ?? "",
    ruleBookLanguages,
    value: valueCentsToInput(valueCents),
    acquiredOn: acquiredOn ?? "",
    editionMode: versionId ? "existing" : "none",
    editionVersionId: versionId ?? "",
  });
  const [form, setForm] = useState(initialForm);
  const initialInventoryNumber =
    inventoryNumber != null ? String(inventoryNumber) : "";
  const [inventoryNumberValue, setInventoryNumberValue] = useState(
    initialInventoryNumber,
  );

  function reset() {
    setForm(initialForm());
    setInventoryNumberValue(initialInventoryNumber);
  }

  return (
    <ActionDialog
      refresh
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
        updateGameCopy(
          copyId,
          exemplarFormToCopyInput(form, inventoryNumberValue),
        )
      }
      onReset={reset}
    >
      <InventoryNumberField
        id={`copy-${copyId}-inventory-number`}
        value={inventoryNumberValue}
        onChange={setInventoryNumberValue}
      />
      <EditBoardGameExemplar
        idPrefix={`copy-${copyId}`}
        boardGameId={boardGameId}
        values={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
      />
    </ActionDialog>
  );
}

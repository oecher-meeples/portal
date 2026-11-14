"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import type { RuleBookLanguage } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { EditionFields } from "@/components/widgets/board-game/edition-fields";
import {
  EMPTY_BOARD_GAME_FORM,
  editionSelectionFromForm,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";
import { RuleBookLanguagesField } from "@/components/widgets/board-game/rule-book-languages-field";
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
  const [condition, setCondition] = useState("");
  const [ruleBookLanguages, setRuleBookLanguages] = useState<
    RuleBookLanguage[]
  >([]);
  const [inventoryNumber, setInventoryNumber] = useState("");
  const [edition, setEdition] = useState<BoardGameFormValues>(
    EMPTY_BOARD_GAME_FORM,
  );

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
        createGameCopy(boardGameId, {
          condition: condition || undefined,
          ruleBookLanguages,
          inventoryNumber,
          edition: editionSelectionFromForm(edition),
        })
      }
      onReset={() => {
        setCondition("");
        setRuleBookLanguages([]);
        setInventoryNumber("");
        setEdition(EMPTY_BOARD_GAME_FORM);
      }}
    >
      <TextField
        id={`add-copy-${boardGameId}-inventory-number`}
        label="Inventarnummer"
        value={inventoryNumber}
        onChange={(event) => setInventoryNumber(event.target.value)}
      />
      <TextField
        id={`add-copy-${boardGameId}-condition`}
        label="Mängelvermerk"
        value={condition}
        onChange={(event) => setCondition(event.target.value)}
      />
      <RuleBookLanguagesField
        idPrefix={`add-copy-${boardGameId}`}
        value={ruleBookLanguages}
        onChange={setRuleBookLanguages}
      />
      <EditionFields
        idPrefix={`add-copy-${boardGameId}`}
        values={edition}
        onChange={(patch) => setEdition((prev) => ({ ...prev, ...patch }))}
        boardGameId={boardGameId}
      />
    </ActionDialog>
  );
}

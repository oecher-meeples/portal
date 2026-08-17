"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { updateBoardGame } from "@/lib/ludothek/board-games";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { AlternateNamesManager } from "@/components/widgets/board-game/alternate-names-manager";
import {
  boardGameFormToTitleInput,
  boardGameToFormValues,
  type BoardGameFormValues,
  type BoardGameRecord,
} from "@/components/widgets/board-game/board-game-form-values";

/** Title-level fields only — the exemplar-specific `condition` doesn't apply
 * here, so it's forced to `null` and never submitted (see `EditBoardGameDialog`
 * for the per-copy variant). */
export type EditableBoardGameTitle = {
  boardGameId: string;
} & Omit<BoardGameRecord, "condition">;

function toFormValues(game: EditableBoardGameTitle) {
  return boardGameToFormValues({ ...game, condition: null });
}

/** Edits a title's shared fields from the detail page header — for
 * `games:manage` holders only (see #121/#122). */
export function EditBoardGameTitleDialog({
  game,
  mechanicsOptions,
}: {
  game: EditableBoardGameTitle;
  /** Every distinct mechanic already in the Bestand — Autocomplete-Vorschläge
   * für das Mechaniken-Multiselect (#124). */
  mechanicsOptions?: string[];
}) {
  const [form, setForm] = useState<BoardGameFormValues>(() =>
    toFormValues(game),
  );

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="size-4" />
          Titel bearbeiten
        </Button>
      }
      title="Titel bearbeiten"
      description="Stammdaten korrigieren, u. a. das automatisch übernommene Erklärvideo."
      contentClassName="sm:max-w-2xl"
      submitLabel="Speichern"
      canSubmit={form.title.trim().length > 0}
      action={() =>
        updateBoardGame(game.boardGameId, boardGameFormToTitleInput(form))
      }
      onReset={() => setForm(toFormValues(game))}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <EditBoardGameTitle
          idPrefix={`edit-title-${game.boardGameId}`}
          values={form}
          onChange={patchForm}
          mechanicsOptions={mechanicsOptions}
        />
        <AlternateNamesManager boardGameId={game.boardGameId} />
      </div>
    </ActionDialog>
  );
}

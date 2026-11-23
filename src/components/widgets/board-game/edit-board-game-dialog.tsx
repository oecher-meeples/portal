"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { updateBoardGame } from "@/lib/ludothek/board-games";
import { updateGameCopy } from "@/lib/ludothek/game-copies";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import {
  boardGameFormToTitleInput,
  boardGameToFormValues,
  type BoardGameFormValues,
  type BoardGameRecord,
} from "@/components/widgets/board-game/board-game-form-values";

/** `id` is the copy being edited, `boardGameId` its title — both get updated. */
export type EditableBoardGame = {
  id: string;
  boardGameId: string;
} & BoardGameRecord;

export function EditBoardGameDialog({ game }: { game: EditableBoardGame }) {
  const [form, setForm] = useState<BoardGameFormValues>(
    boardGameToFormValues(game),
  );

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function save() {
    const [titleResult, copyResult] = await Promise.all([
      updateBoardGame(game.boardGameId, boardGameFormToTitleInput(form)),
      updateGameCopy(game.id, {
        condition: form.condition || undefined,
        ruleBookLanguages: form.ruleBookLanguages,
      }),
    ]);
    return "error" in titleResult ? titleResult : copyResult;
  }

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="ghost">
          <Pencil className="size-4" />
          Bearbeiten
        </Button>
      }
      title="Spiel bearbeiten"
      description="Alle Stammdaten korrigieren, u. a. das automatisch übernommene Erklärvideo."
      contentClassName="sm:max-w-lg"
      submitLabel="Speichern"
      canSubmit={Boolean(form.title.trim())}
      action={save}
      onReset={() => setForm(boardGameToFormValues(game))}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <EditBoardGameTitle
          idPrefix={`edit-${game.id}`}
          values={form}
          onChange={patchForm}
        />
        <EditBoardGameExemplar
          idPrefix={`edit-${game.id}`}
          values={form}
          onChange={patchForm}
        />
      </div>
    </ActionDialog>
  );
}

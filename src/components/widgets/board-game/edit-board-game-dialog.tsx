"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateBoardGame } from "@/lib/ludothek/board-games";
import {
  BoardGameFormFields,
  boardGameFormToInput,
  boardGameToFormValues,
  type BoardGameFormValues,
  type BoardGameRecord,
} from "@/components/widgets/board-game/board-game-form-fields";

export type EditableBoardGame = { id: string } & BoardGameRecord;

export function EditBoardGameDialog({ game }: { game: EditableBoardGame }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BoardGameFormValues>(
    boardGameToFormValues(game),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setForm(boardGameToFormValues(game));
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const result = await updateBoardGame(game.id, boardGameFormToInput(form));
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost">
            <Pencil className="size-4" />
            Bearbeiten
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spiel bearbeiten</DialogTitle>
          <DialogDescription>
            Alle Stammdaten korrigieren, u. a. das automatisch übernommene
            Erklärvideo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          <BoardGameFormFields
            idPrefix={`edit-${game.id}`}
            values={form}
            onChange={patchForm}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim()}
          >
            {isSubmitting ? "Speichere…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

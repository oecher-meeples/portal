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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateBoardGame,
  type BoardGameInput,
} from "@/components/feature/admin-bestand/actions";
import type { AdminBoardGameRow } from "@/components/feature/admin-bestand/admin-bestand-view";

export function EditBoardGameDialog({ game }: { game: AdminBoardGameRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(game.title);
  const [ean, setEan] = useState(game.ean ?? "");
  const [condition, setCondition] = useState(game.condition ?? "");
  const [explainerVideoUrl, setExplainerVideoUrl] = useState(
    game.explainerVideoUrl ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle(game.title);
    setEan(game.ean ?? "");
    setCondition(game.condition ?? "");
    setExplainerVideoUrl(game.explainerVideoUrl ?? "");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const input: BoardGameInput = {
      title,
      ean: ean || undefined,
      condition: condition || undefined,
      explainerVideoUrl: explainerVideoUrl || undefined,
      bggId: game.bggId,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      playTimeMinutes: game.playTimeMinutes,
      weight: game.weight,
      imageUrl: game.imageUrl,
      description: game.description,
      mechanics: game.mechanics,
    };

    const result = await updateBoardGame(game.id, input);
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
            Stammdaten korrigieren, u. a. das automatisch übernommene
            Erklärvideo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-title-${game.id}`}>Titel</Label>
            <Input
              id={`edit-title-${game.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-ean-${game.id}`}>EAN</Label>
            <Input
              id={`edit-ean-${game.id}`}
              value={ean}
              onChange={(event) => setEan(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-condition-${game.id}`}>Zustand</Label>
            <Input
              id={`edit-condition-${game.id}`}
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-video-${game.id}`}>
              Erklärvideo (YouTube-Link)
            </Label>
            <Input
              id={`edit-video-${game.id}`}
              value={explainerVideoUrl}
              onChange={(event) => setExplainerVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <p className="text-muted-foreground text-xs">
              Wird beim BGG-Import automatisch übernommen, falls vorhanden —
              hier korrigierbar.
            </p>
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? "Speichere…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

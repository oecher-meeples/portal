"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { TextField } from "@/components/ui/field";
import {
  createBoardGame,
  previewBggImport,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import { parseBggId } from "@/lib/ludothek/bgg-id";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EanField } from "@/components/widgets/board-game/ean-field";
import {
  CreateBoardGameLocationField,
  type LocationPlacement,
} from "@/components/widgets/board-game/create-board-game-location-field";
import {
  EMPTY_BOARD_GAME_FORM,
  boardGameFormToInput,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";
import type { BggGameData } from "@/lib/bgg/client";

type Mode = "manual" | "bgg";

export function CreateBoardGameDialog({
  defaultEan,
}: {
  defaultEan?: string;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(defaultEan));
  const [mode, setMode] = useState<Mode>("manual");
  const [bggIdInput, setBggIdInput] = useState("");
  const [preview, setPreview] = useState<BggGameData | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [form, setForm] = useState<BoardGameFormValues>({
    ...EMPTY_BOARD_GAME_FORM,
    ean: defaultEan ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placement, setPlacement] = useState<LocationPlacement | null>(null);

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setMode("manual");
    setBggIdInput("");
    setPreview(null);
    setForm({ ...EMPTY_BOARD_GAME_FORM, ean: defaultEan ?? "" });
    setError(null);
    setPlacement(null);
  }

  async function handleFetchPreview() {
    const bggId = parseBggId(bggIdInput);
    if (!bggId) {
      setError("Bitte eine gültige BGG-ID (positive Zahl) angeben.");
      return;
    }

    setError(null);
    setIsFetchingPreview(true);
    try {
      const result = await previewBggImport(bggId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setPreview(result.data);
      patchForm({ title: result.data.title });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die BGG-Vorschau konnte nicht geladen werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsFetchingPreview(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const input: CreateBoardGameInput = {
      ...(mode === "manual"
        ? boardGameFormToInput(form)
        : {
            title: form.title,
            ean: form.ean || undefined,
            condition: form.condition || undefined,
            ...(preview
              ? {
                  bggId: parseBggId(bggIdInput),
                  minPlayers: preview.minPlayers,
                  maxPlayers: preview.maxPlayers,
                  playTimeMinutes: preview.playTimeMinutes,
                  weight: preview.weight,
                  imageUrl: preview.imageUrl,
                  description: preview.description,
                  mechanics: preview.mechanics,
                  explainerVideoUrl: preview.explainerVideoUrl,
                }
              : {}),
          }),
      ...(placement ? { placement } : {}),
    };

    try {
      const result = await createBoardGame(input);
      setIsSubmitting(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setLastHint(result.hint ?? null);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Das Spiel konnte nicht angelegt werden. Bitte erneut versuchen.",
      );
    }
  }

  const canSubmit =
    mode === "manual" ? form.title.trim().length > 0 : Boolean(preview);

  return (
    <div className="flex flex-col items-end gap-2">
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) reset();
        }}
      >
        <DialogTrigger
          render={
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Spiel anlegen
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neues Spiel anlegen</DialogTitle>
            <DialogDescription>
              Manuell erfassen oder per BoardGameGeek-ID importieren.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              Manuell
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "bgg" ? "default" : "outline"}
              onClick={() => setMode("bgg")}
            >
              Via BGG-ID
            </Button>
          </div>

          {mode === "bgg" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="bgg-id">BGG-ID</Label>
                  <Input
                    id="bgg-id"
                    value={bggIdInput}
                    onChange={(event) => setBggIdInput(event.target.value)}
                    placeholder="z. B. 342942"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleFetchPreview}
                  disabled={isFetchingPreview}
                >
                  {isFetchingPreview ? "Lade Vorschau…" : "Vorschau laden"}
                </Button>
              </div>
              {preview && (
                <div className="flex gap-3 rounded-md border p-3">
                  {preview.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- BGG-hosted preview image, not next/image-optimizable
                    <img
                      src={preview.imageUrl}
                      alt={preview.title}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-medium">{preview.title}</p>
                    {preview.minPlayers && preview.maxPlayers && (
                      <p className="text-muted-foreground">
                        {preview.minPlayers}–{preview.maxPlayers} Spieler
                      </p>
                    )}
                    {preview.playTimeMinutes && (
                      <p className="text-muted-foreground">
                        {preview.playTimeMinutes} Min.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(mode === "manual" || preview) && (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
              {mode === "manual" ? (
                <EditBoardGameTitle
                  idPrefix="game"
                  values={form}
                  onChange={patchForm}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    id="game-title"
                    label="Titel"
                    fieldClassName="sm:col-span-2"
                    value={form.title}
                    onChange={(event) =>
                      patchForm({ title: event.target.value })
                    }
                    required
                  />
                  <EanField
                    idPrefix="game"
                    value={form.ean}
                    onChange={(ean) => patchForm({ ean })}
                  />
                </div>
              )}
              <EditBoardGameExemplar
                idPrefix="game"
                values={form}
                onChange={patchForm}
              />
              <CreateBoardGameLocationField onResolved={setPlacement} />
              {!placement && (
                <p className="text-muted-foreground text-xs">
                  Ohne Standort-Angabe liegt das Spiel zunächst in
                  „Unsortiert“.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? "Speichere…" : "Spiel anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lastHint && <p className="text-sm text-amber-600">{lastHint}</p>}
    </div>
  );
}

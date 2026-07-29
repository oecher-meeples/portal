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
import {
  createBoardGame,
  previewBggImport,
  type BoardGameInput,
} from "@/components/feature/admin-bestand/actions";
import { parseBggId } from "@/components/feature/admin-bestand/bgg-id";
import type { BggGameData } from "@/lib/bgg/client";

type Mode = "manual" | "bgg";

const EMPTY_FORM = {
  title: "",
  ean: "",
  condition: "",
};

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
  const [form, setForm] = useState({ ...EMPTY_FORM, ean: defaultEan ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setMode("manual");
    setBggIdInput("");
    setPreview(null);
    setForm({ ...EMPTY_FORM, ean: defaultEan ?? "" });
    setError(null);
  }

  async function handleFetchPreview() {
    const bggId = parseBggId(bggIdInput);
    if (!bggId) {
      setError("Bitte eine gültige BGG-ID (positive Zahl) angeben.");
      return;
    }

    setError(null);
    setIsFetchingPreview(true);
    const result = await previewBggImport(bggId);
    setIsFetchingPreview(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPreview(result.data);
    setForm((prev) => ({ ...prev, title: result.data.title }));
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const input: BoardGameInput = {
      title: form.title,
      ean: form.ean || undefined,
      condition: form.condition || undefined,
      ...(mode === "bgg" && preview
        ? {
            bggId: parseBggId(bggIdInput),
            minPlayers: preview.minPlayers,
            maxPlayers: preview.maxPlayers,
            playTimeMinutes: preview.playTimeMinutes,
            weight: preview.weight,
            imageUrl: preview.imageUrl,
            description: preview.description,
            mechanics: preview.mechanics,
          }
        : {}),
    };

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
  }

  const canSubmit = mode === "manual" ? form.title.trim().length > 0 : Boolean(preview);

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
        <DialogContent className="sm:max-w-md">
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="game-title">Titel</Label>
                <Input
                  id="game-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="game-ean">EAN</Label>
                <Input
                  id="game-ean"
                  value={form.ean}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ean: event.target.value }))
                  }
                  placeholder="optional, vom Barcode auf der Schachtel"
                />
                <p className="text-muted-foreground text-xs">
                  Mehrere Spiele desselben Titels dürfen dieselbe EAN tragen.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="game-condition">Zustand</Label>
                <Input
                  id="game-condition"
                  value={form.condition}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      condition: event.target.value,
                    }))
                  }
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Das Spiel liegt zunächst in „Unsortiert" — Standort per Scan
                einlagern.
              </p>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Speichere…" : "Spiel anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lastHint && <p className="text-sm text-amber-600">{lastHint}</p>}
    </div>
  );
}

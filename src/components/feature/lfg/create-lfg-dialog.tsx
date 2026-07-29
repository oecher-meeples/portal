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
import { Textarea } from "@/components/ui/textarea";
import { createLfgPost } from "@/components/feature/lfg/actions";

const EMPTY_FORM = {
  gameTitle: "",
  title: "",
  plannedAt: "",
  maxParticipants: 4,
  description: "",
};

export function CreateLfgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const result = await createLfgPost({
      title: form.title,
      gameTitle: form.gameTitle || undefined,
      description: form.description,
      plannedAt: form.plannedAt ? new Date(form.plannedAt) : undefined,
      maxParticipants: Number(form.maxParticipants),
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    reset();
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
          <Button className="gap-1.5">
            <Plus className="size-4" />
            Gesuch erstellen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Spielergesuch</DialogTitle>
          <DialogDescription>
            Finde Mitspielende für ein bestimmtes Spiel oder spontan für einen
            Abend.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-game">Spiel (Freitext, optional)</Label>
            <Input
              id="lfg-game"
              value={form.gameTitle}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, gameTitle: event.target.value }))
              }
              placeholder="z. B. Arche Nova"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-title">Titel</Label>
            <Input
              id="lfg-title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="z. B. Runde am Freitag"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfg-date">Datum (optional)</Label>
              <Input
                id="lfg-date"
                type="date"
                value={form.plannedAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, plannedAt: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfg-max">Max. Teilnehmer</Label>
              <Input
                id="lfg-max"
                type="number"
                min={2}
                value={form.maxParticipants}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxParticipants: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-desc">Beschreibung</Label>
            <Textarea
              id="lfg-desc"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Worauf freust du dich, wen suchst du?"
              required
            />
          </div>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim() || !form.description.trim()}
          >
            {isSubmitting ? "Speichere…" : "Gesuch veröffentlichen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

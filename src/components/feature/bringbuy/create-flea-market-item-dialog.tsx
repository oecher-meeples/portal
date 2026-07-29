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
import { createFleaMarketItem } from "@/components/feature/bringbuy/actions";

export type FleaMarketEventOption = {
  id: string;
  title: string;
  dateLabel: string;
};

const EMPTY_FORM = {
  eventId: "",
  title: "",
  priceEuros: 0,
  description: "",
};

export function CreateFleaMarketItemDialog({
  events,
}: {
  events: FleaMarketEventOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    eventId: events[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setForm({ ...EMPTY_FORM, eventId: events[0]?.id ?? "" });
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const result = await createFleaMarketItem(
      form.eventId,
      form.title,
      Number(form.priceEuros),
      form.description || undefined,
    );
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aktuell ist kein Event für den Flohmarkt geplant.
      </p>
    );
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
            Artikel anlegen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Flohmarkt-Artikel</DialogTitle>
          <DialogDescription>
            Der Artikel wartet nach dem Anlegen auf Freigabe an der Flohmarkt-Kasse,
            bevor er im Gäste-Bereich sichtbar wird.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flea-event">Event</Label>
            <select
              id="flea-event"
              value={form.eventId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventId: event.target.value }))
              }
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} · {event.dateLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flea-title">Titel</Label>
            <Input
              id="flea-title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="z. B. Wingspan"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flea-price">Preis (€)</Label>
            <Input
              id="flea-price"
              type="number"
              min={0}
              value={form.priceEuros}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  priceEuros: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flea-description">Beschreibung (optional)</Label>
            <Textarea
              id="flea-description"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Zustand, Vollständigkeit, Besonderheiten"
            />
          </div>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim() || !form.eventId}
          >
            {isSubmitting ? "Speichere…" : "Artikel anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
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
import { createEvent, updateEvent } from "@/components/feature/admin-events/actions";

export type EditableEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
};

/** `datetime-local` inputs need "YYYY-MM-DDTHH:mm", an ISO string is longer. */
function toDateTimeLocal(iso: string) {
  return iso.slice(0, 16);
}

export function EventDialog({ event }: { event?: EditableEvent }) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    event ? toDateTimeLocal(event.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.endsAt ? toDateTimeLocal(event.endsAt) : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setTitle(event?.title ?? "");
    setStartsAt(event ? toDateTimeLocal(event.startsAt) : "");
    setEndsAt(event?.endsAt ? toDateTimeLocal(event.endsAt) : "");
    setLocation(event?.location ?? "");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!startsAt) {
      setError("Bitte einen Start-Zeitpunkt angeben.");
      return;
    }
    setIsSubmitting(true);
    const input = {
      title,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      location: location || null,
    };
    const result = event
      ? await updateEvent(event.id, input)
      : await createEvent(input);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    if (!isEdit) reset();
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
          isEdit ? (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="size-4" />
              Bearbeiten
            </Button>
          ) : (
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Event anlegen
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Event bearbeiten" : "Neues Event"}</DialogTitle>
          <DialogDescription>
            Losgelöst vom Kalender-Feed — das Event ist die Grundlage für
            Schichten, Erklärbären und Flohmarkt-Artikel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Titel</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(fieldEvent) => setTitle(fieldEvent.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-starts">Beginn</Label>
          <Input
            id="event-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(fieldEvent) => setStartsAt(fieldEvent.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-ends">Ende (optional)</Label>
          <Input
            id="event-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(fieldEvent) => setEndsAt(fieldEvent.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-location">Ort (optional)</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(fieldEvent) => setLocation(fieldEvent.target.value)}
            placeholder="z. B. Vereinsheim"
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !startsAt}
          >
            {isSubmitting
              ? "Speichere…"
              : isEdit
                ? "Speichern"
                : "Event anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

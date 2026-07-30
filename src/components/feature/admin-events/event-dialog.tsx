"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  createEvent,
  updateEvent,
} from "@/components/feature/admin-events/actions";

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
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    event ? toDateTimeLocal(event.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.endsAt ? toDateTimeLocal(event.endsAt) : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");

  function reset() {
    setTitle(event?.title ?? "");
    setStartsAt(event ? toDateTimeLocal(event.startsAt) : "");
    setEndsAt(event?.endsAt ? toDateTimeLocal(event.endsAt) : "");
    setLocation(event?.location ?? "");
  }

  return (
    <ActionDialog
      trigger={
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
      title={isEdit ? "Event bearbeiten" : "Neues Event"}
      description="Losgelöst vom Kalender-Feed — das Event ist die Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel."
      submitLabel={isEdit ? "Speichern" : "Event anlegen"}
      canSubmit={Boolean(title.trim()) && Boolean(startsAt)}
      action={() => {
        const input = {
          title,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          location: location || null,
        };
        return event ? updateEvent(event.id, input) : createEvent(input);
      }}
      onReset={reset}
    >
      <TextField
        id="event-title"
        label="Titel"
        value={title}
        onChange={(fieldEvent) => setTitle(fieldEvent.target.value)}
        required
      />
      <TextField
        id="event-starts"
        label="Beginn"
        type="datetime-local"
        value={startsAt}
        onChange={(fieldEvent) => setStartsAt(fieldEvent.target.value)}
        required
      />
      <TextField
        id="event-ends"
        label="Ende (optional)"
        type="datetime-local"
        value={endsAt}
        onChange={(fieldEvent) => setEndsAt(fieldEvent.target.value)}
      />
      <TextField
        id="event-location"
        label="Ort (optional)"
        value={location}
        onChange={(fieldEvent) => setLocation(fieldEvent.target.value)}
        placeholder="z. B. Vereinsheim"
      />
    </ActionDialog>
  );
}

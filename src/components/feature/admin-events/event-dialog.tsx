"use client";

import { useState } from "react";
import type { EventVisibility } from "@prisma/client";
import { Plus, Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createEvent,
  updateEvent,
} from "@/components/feature/admin-events/actions";
import { EVENT_VISIBILITY_LABELS } from "@/lib/events/visibility";

export type EditableEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  helpersWanted: boolean;
  visibility: EventVisibility;
};

/** `date` inputs need "YYYY-MM-DD", an ISO string is longer. Beginn/Ende sind ein
 * reiner Datumsbereich — die Uhrzeit je Tag wird erst auf der Eventseite gesetzt (#150). */
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function EventDialog({ event }: { event?: EditableEvent }) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    event ? toDateInput(event.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.endsAt ? toDateInput(event.endsAt) : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [helpersWanted, setHelpersWanted] = useState(
    event?.helpersWanted ?? false,
  );
  const [visibility, setVisibility] = useState<EventVisibility>(
    event?.visibility ?? "DRAFT",
  );

  function reset() {
    setTitle(event?.title ?? "");
    setStartsAt(event ? toDateInput(event.startsAt) : "");
    setEndsAt(event?.endsAt ? toDateInput(event.endsAt) : "");
    setLocation(event?.location ?? "");
    setHelpersWanted(event?.helpersWanted ?? false);
    setVisibility(event?.visibility ?? "DRAFT");
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
      description="Losgelöst vom Kalender-Feed — das Event ist die Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel. Uhrzeiten je Tag werden anschließend auf der Eventseite festgelegt."
      submitLabel={isEdit ? "Speichern" : "Event anlegen"}
      canSubmit={Boolean(title.trim()) && Boolean(startsAt)}
      action={() => {
        const input = {
          title,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          location: location || null,
          helpersWanted,
          visibility,
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
        type="date"
        value={startsAt}
        onChange={(fieldEvent) => setStartsAt(fieldEvent.target.value)}
        required
      />
      <TextField
        id="event-ends"
        label="Ende (optional)"
        type="date"
        value={endsAt}
        onChange={(fieldEvent) => setEndsAt(fieldEvent.target.value)}
      />
      <Field label="Sichtbarkeit" htmlFor="event-visibility">
        <select
          id="event-visibility"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={visibility}
          onChange={(fieldEvent) =>
            setVisibility(fieldEvent.target.value as EventVisibility)
          }
        >
          {Object.entries(EVENT_VISIBILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {isEdit && (
        <>
          <TextField
            id="event-location"
            label="Ort (optional)"
            value={location}
            onChange={(fieldEvent) => setLocation(fieldEvent.target.value)}
            placeholder="z. B. Vereinsheim"
          />
          <Label className="flex items-center justify-between gap-2 font-normal">
            Helfer suchen
            <Switch
              id="event-helpers-wanted"
              checked={helpersWanted}
              onCheckedChange={setHelpersWanted}
            />
          </Label>
        </>
      )}
    </ActionDialog>
  );
}

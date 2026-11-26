"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventVisibility, HelperPhase } from "@prisma/client";
import { Plus, Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/field";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NativeSelect } from "@/components/ui/native-select";
import {
  createEvent,
  updateEvent,
} from "@/components/feature/admin-events/actions";
import { EVENT_VISIBILITY_LABELS } from "@/lib/events/visibility";
import {
  HELPER_PHASE_LABELS,
  HELPER_PHASE_ORDER,
} from "@/lib/events/helper-phase";

export type EditableEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  helperPhase: HelperPhase;
  visibility: EventVisibility;
};

/** `date` inputs need "YYYY-MM-DD", an ISO string is longer. Beginn/Ende sind ein
 * reiner Datumsbereich — die Uhrzeit je Tag wird erst auf der Eventseite gesetzt (#150). */
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function EventDialog({ event }: { event?: EditableEvent }) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    event ? toDateInput(event.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.endsAt ? toDateInput(event.endsAt) : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [helperPhase, setHelperPhase] = useState<HelperPhase>(
    event?.helperPhase ?? "PLANNING",
  );
  const [visibility, setVisibility] = useState<EventVisibility>(
    event?.visibility ?? "DRAFT",
  );

  function reset() {
    setTitle(event?.title ?? "");
    setStartsAt(event ? toDateInput(event.startsAt) : "");
    setEndsAt(event?.endsAt ? toDateInput(event.endsAt) : "");
    setLocation(event?.location ?? "");
    setHelperPhase(event?.helperPhase ?? "PLANNING");
    setVisibility(event?.visibility ?? "DRAFT");
  }

  return (
    <ActionDialog
      refresh
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
      action={async () => {
        const input = {
          title,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          location: location || null,
          // Beim Anlegen gilt der Default (Planungsphase), siehe #676.
          ...(isEdit ? { helperPhase } : {}),
          visibility,
        };
        if (event) return updateEvent(event.id, input);

        const result = await createEvent(input);
        // #458: nach dem Anlegen direkt zur neuen Event-Detailseite statt
        // auf der Übersicht zu bleiben.
        if ("success" in result) {
          // #458-Folgefehler: die Route ist /admin/events/[id], nicht [slug]
          // (result.slug führte zu 404).
          router.push(`/admin/events/${result.id}`);
        }
        return result;
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
      <DateRangePicker
        id="event-daterange"
        label="Beginn – Ende (optional)"
        value={{ start: startsAt, end: endsAt }}
        onChange={({ start, end }) => {
          setStartsAt(start);
          setEndsAt(end);
        }}
        required
      />
      <Field label="Sichtbarkeit" htmlFor="event-visibility">
        <NativeSelect
          id="event-visibility"
          size="md"
          className="w-full"
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
        </NativeSelect>
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
          <Field label="Helfersichtbarkeit" htmlFor="event-helper-phase">
            <NativeSelect
              id="event-helper-phase"
              size="md"
              className="w-full"
              value={helperPhase}
              onChange={(fieldEvent) =>
                setHelperPhase(fieldEvent.target.value as HelperPhase)
              }
            >
              {HELPER_PHASE_ORDER.map((phase) => (
                <option key={phase} value={phase}>
                  {HELPER_PHASE_LABELS[phase]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

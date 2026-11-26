"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { createEvent } from "@/components/feature/admin-events/actions";
import {
  EventFormFields,
  eventFormValues,
} from "@/components/feature/admin-events/event-form-fields";

/** Event anlegen (#680) — nur noch zum Anlegen: neue Events starten als
 * Entwurf und Planungsphase, alles Weitere bearbeitet die Stammdaten-Spalte
 * der Detailseite. */
export function EventDialog() {
  const router = useRouter();
  const [values, setValues] = useState(eventFormValues());

  function reset() {
    setValues(eventFormValues());
  }

  return (
    <ActionDialog
      refresh
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Event anlegen
        </Button>
      }
      title="Neues Event"
      description="Losgelöst vom Kalender-Feed — das Event ist die Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel. Uhrzeiten je Tag werden anschließend auf der Eventseite festgelegt."
      submitLabel="Event anlegen"
      canSubmit={Boolean(values.title.trim()) && Boolean(values.startsAt)}
      action={async () => {
        const result = await createEvent({
          title: values.title,
          startsAt: new Date(values.startsAt),
          endsAt: values.endsAt ? new Date(values.endsAt) : null,
        });
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
      <EventFormFields
        idPrefix="event"
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      />
    </ActionDialog>
  );
}

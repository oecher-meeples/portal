"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import {
  setEventHelperPhase,
  updateEvent,
} from "@/components/feature/admin-events/actions";
import {
  EventFormFields,
  eventFormValues,
  type EditableEvent,
} from "@/components/feature/admin-events/event-form-fields";

/** Stammdaten-Spalte der Event-Detailseite (#680): readonly, bis "Bearbeiten"
 * die Felder freischaltet; "Speichern" persistiert und aktualisiert die Seite
 * (angepasste Öffnungszeiten je Tag). Die Helfersichtbarkeit läuft über
 * dieselbe Action wie der Schalter "Schichten anfragen" (#676). */
export function EventMasterDataForm({
  event,
  editing,
  onEditingChange,
}: {
  event: EditableEvent;
  /** Bearbeiten-Modus, gemeinsam mit den Öffnungszeiten (`EventStammdaten`). */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const [values, setValues] = useState(eventFormValues(event));
  const { run, pending, error } = useAction({
    refresh: true,
    onSuccess: () => onEditingChange(false),
  });

  function cancel() {
    setValues(eventFormValues(event));
    onEditingChange(false);
  }

  function save() {
    run(async () => {
      const result = await updateEvent(event.id, {
        title: values.title,
        startsAt: new Date(values.startsAt),
        endsAt: values.endsAt ? new Date(values.endsAt) : null,
        location: values.location || null,
        visibility: values.visibility,
      });
      if ("error" in result) return result;
      if (values.helperPhase !== event.helperPhase) {
        return setEventHelperPhase(event.id, values.helperPhase);
      }
      return result;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Event-Daten</h3>
      <EventFormFields
        idPrefix={`event-${event.id}`}
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        showDetails
        disabled={!editing || pending}
      />
      {editing && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={pending || !values.title.trim() || !values.startsAt}
          >
            {pending ? "Speichere…" : "Speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancel}
            disabled={pending}
          >
            Abbrechen
          </Button>
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDayTimeForm } from "@/components/feature/admin-events/event-day-time-form";
import type { EditableEventDay } from "@/components/feature/admin-events/event-day-time-form";
import { EventMasterDataForm } from "@/components/feature/admin-events/event-master-data-form";
import type { EditableEvent } from "@/components/feature/admin-events/event-form-fields";

/** Stammdaten der Event-Detailseite: Event-Daten und Öffnungszeiten je Tag
 * sind gemeinsam schreibgeschützt, bis "Bearbeiten" sie freischaltet. Die
 * Öffnungszeiten-Regler gibt es nur im Bearbeiten-Modus. */
export function EventStammdaten({
  event,
  days,
}: {
  event: EditableEvent;
  days: EditableEventDay[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex justify-end">
        {!editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            Bearbeiten
          </Button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* key: nach dem Speichern + Refresh den Formularstand neu aus den
            frisch geladenen Stammdaten aufbauen. */}
        <EventMasterDataForm
          key={`${event.title}|${event.startsAt}|${event.endsAt}|${event.location}|${event.visibility}|${event.helperPhase}`}
          event={event}
          editing={editing}
          onEditingChange={setEditing}
        />
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Öffnungszeiten je Tag</h3>
          {days.map((day) => (
            <EventDayTimeForm key={day.id} day={day} editing={editing} />
          ))}
        </div>
      </div>
    </div>
  );
}

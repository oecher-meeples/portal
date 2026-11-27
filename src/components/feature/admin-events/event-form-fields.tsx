"use client";

import type { EventVisibility, HelperPhase } from "@prisma/client";
import { Field, TextField } from "@/components/ui/field";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NativeSelect } from "@/components/ui/native-select";
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

/** Formularstand: Datumsfelder als "YYYY-MM-DD", leer = nicht gesetzt. */
export type EventFormValues = {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  visibility: EventVisibility;
  helperPhase: HelperPhase;
};

/** `date` inputs need "YYYY-MM-DD", an ISO string is longer. Beginn/Ende sind ein
 * reiner Datumsbereich — die Uhrzeit je Tag wird erst auf der Eventseite gesetzt (#150). */
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function eventFormValues(event?: EditableEvent): EventFormValues {
  return {
    title: event?.title ?? "",
    startsAt: event ? toDateInput(event.startsAt) : "",
    endsAt: event?.endsAt ? toDateInput(event.endsAt) : "",
    location: event?.location ?? "",
    visibility: event?.visibility ?? "DRAFT",
    helperPhase: event?.helperPhase ?? "PLANNING",
  };
}

/**
 * Eingabefelder eines Events (#680) — geteilt vom Anlegen-Dialog (nur Titel
 * und Zeitraum, neue Events starten als Entwurf/Planungsphase) und der
 * Stammdaten-Spalte der Detailseite (`showDetails`: zusätzlich Ort, Event-
 * und Helfersichtbarkeit).
 */
export function EventFormFields({
  idPrefix,
  values,
  onChange,
  showDetails = false,
  disabled = false,
}: {
  idPrefix: string;
  values: EventFormValues;
  onChange: (patch: Partial<EventFormValues>) => void;
  showDetails?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <TextField
        id={`${idPrefix}-title`}
        label="Titel"
        value={values.title}
        onChange={(event) => onChange({ title: event.target.value })}
        disabled={disabled}
        required
      />
      <DateRangePicker
        id={`${idPrefix}-daterange`}
        label="Beginn – Ende (optional)"
        value={{ start: values.startsAt, end: values.endsAt }}
        onChange={({ start, end }) =>
          onChange({ startsAt: start, endsAt: end })
        }
        disabled={disabled}
        required
      />
      {showDetails && (
        <>
          <TextField
            id={`${idPrefix}-location`}
            label="Ort (optional)"
            value={values.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="z. B. Vereinsheim"
            disabled={disabled}
          />
          <Field label="Eventsichtbarkeit" htmlFor={`${idPrefix}-visibility`}>
            <NativeSelect
              id={`${idPrefix}-visibility`}
              size="md"
              className="w-full"
              value={values.visibility}
              disabled={disabled}
              onChange={(event) =>
                onChange({ visibility: event.target.value as EventVisibility })
              }
            >
              {Object.entries(EVENT_VISIBILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Helfersichtbarkeit"
            htmlFor={`${idPrefix}-helper-phase`}
          >
            <NativeSelect
              id={`${idPrefix}-helper-phase`}
              size="md"
              className="w-full"
              value={values.helperPhase}
              disabled={disabled}
              onChange={(event) =>
                onChange({ helperPhase: event.target.value as HelperPhase })
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
    </>
  );
}

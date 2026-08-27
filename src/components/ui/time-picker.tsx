"use client";

import type { ReactNode } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";

const STEP_MINUTES = 15;

function buildTimeOptions(stepMinutes: number): string[] {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    options.push(`${hours}:${mins}`);
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions(STEP_MINUTES);

/** `<input type="time">` needs "HH:mm" — the one place an ISO string gets
 * converted into that shape, instead of every caller repeating it. */
export function timeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toTimeString().slice(0, 5);
}

/**
 * Fachfreie Uhrzeit-Auswahl (HH:mm) mit Label — ersetzt das früher
 * wiederholte `TextField type="time"` (native Browser-Uhr, sieht je nach
 * Browser/OS unterschiedlich aus) in Öffnungszeiten-je-Tag, Helfer-
 * Verfügbarkeit, Schicht-Ziel-Zeitraum. Dropdown mit 15-Minuten-Raster,
 * tippen filtert; `onBlur` fürs Auto-Speichern beim Verlassen des Felds.
 */
export function TimePicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  fieldClassName,
  required,
  disabled,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  fieldClassName?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} className={fieldClassName}>
      <Combobox
        items={TIME_OPTIONS}
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <ComboboxInput
          id={id}
          placeholder="--:--"
          required={required}
          onBlur={onBlur}
        />
        <ComboboxPopup>
          <ComboboxEmpty>Keine Treffer</ComboboxEmpty>
          <ComboboxList>
            {(time) => (
              <ComboboxItem key={time} value={time}>
                {time}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </Field>
  );
}

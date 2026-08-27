import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** `<input type="time">` needs "HH:mm" — the one place an ISO string gets
 * converted into that shape, instead of every caller repeating it. */
export function timeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toTimeString().slice(0, 5);
}

/**
 * Fachfreie Uhrzeit-Eingabe (HH:mm) mit Label — ersetzt das wiederholte
 * `TextField type="time"` in Öffnungszeiten-je-Tag, Helfer-Verfügbarkeit
 * und ähnlichen Formularen. Kennt kein Datenmodell; `timeInputValue()`
 * erledigt die ISO-→-"HH:mm"-Umwandlung für den Aufrufer.
 */
export function TimePicker({
  id,
  label,
  value,
  onChange,
  fieldClassName,
  required,
  disabled,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  fieldClassName?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} className={fieldClassName}>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      />
    </Field>
  );
}

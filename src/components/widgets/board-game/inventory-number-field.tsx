"use client";

import { TextField } from "@/components/ui/field";

/** Inventarnummer-Eingabe der Exemplar-Dialoge (#543) — nur positive
 * Ganzzahlen. Der Wert bleibt Text (leer = keine Nummer); geparst wird erst
 * in `exemplarFormToCopyInput()`, geprüft serverseitig. */
export function InventoryNumberField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      id={id}
      label="Inventarnummer"
      type="number"
      inputMode="numeric"
      min={1}
      step={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

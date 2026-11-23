"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BggIdSearchDialog } from "@/components/widgets/board-game/bgg-id-search-dialog";

/**
 * BGG-ID-Feld mit Lupen-Icon zur Namenssuche (#206) — analog
 * `ExplainerVideoField`s Scan-Icon. Das Icon erscheint nur, solange das Feld
 * leer ist: eine bereits bekannte BGG-ID soll nicht versehentlich per Suche
 * überschrieben werden.
 */
export function BggIdField({
  idPrefix,
  value,
  title,
  onChange,
}: {
  idPrefix: string;
  value: string;
  title: string;
  onChange: (bggId: string) => void;
}) {
  return (
    <Field label="BGG-ID" htmlFor={`${idPrefix}-bgg-id`}>
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-bgg-id`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="optional, z. B. 342942"
        />
        {value.trim().length === 0 && (
          <BggIdSearchDialog title={title} onSelect={onChange} />
        )}
      </div>
    </Field>
  );
}

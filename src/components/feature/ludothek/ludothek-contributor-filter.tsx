"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";

/** Freitext-Filter über einen Mitwirkenden-Namen (Teilstring,
 * Groß-/Kleinschreibung egal) — gemeinsame Basis für die Verlag-, Autor- und
 * Illustrator-Filter im Ludothek-Panel (Epic #490). Übernommen wird bei
 * Enter oder Verlassen des Feldes. */
export function LudothekContributorFilter({
  id,
  label,
  placeholder,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string | undefined;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    const next = draft.trim();
    if (next !== (value ?? "")) onCommit(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
  }

  return (
    <div className="flex min-w-56 flex-1 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

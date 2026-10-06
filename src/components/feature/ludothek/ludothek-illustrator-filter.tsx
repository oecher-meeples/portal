"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Freitext-Filter nach Illustrator (Teilstring, Groß-/Kleinschreibung egal).
 * Übernommen wird bei Enter oder Verlassen des Feldes. */
export function LudothekIllustratorFilter({
  value,
  onCommit,
}: {
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="ludothek-illustrator-filter">Illustrator</Label>
      <Input
        id="ludothek-illustrator-filter"
        value={draft}
        placeholder="z. B. Klemens Franz"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

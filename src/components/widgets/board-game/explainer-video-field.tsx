"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ExplainerVideoSearchDialog } from "@/components/widgets/board-game/explainer-video-search-dialog";
import { parseBggId } from "@/lib/ludothek/bgg-id";

/**
 * Erklärvideo-Feld mit Lupen-Icon (#185-Folgeanfrage) — analog zu `EanField`s
 * Scan-Icon. Die eigentliche Such-/Auswahl-Logik (BGG → YouTube-Suche →
 * BGG-Fallback, siehe `fetchExplainerVideoOptions()`) liegt in
 * `ExplainerVideoSearchDialog`, damit dieses Feld schlank bleibt.
 */
export function ExplainerVideoField({
  idPrefix,
  value,
  bggIdText,
  onChange,
}: {
  idPrefix: string;
  value: string;
  bggIdText: string;
  onChange: (url: string) => void;
}) {
  const bggId = parseBggId(bggIdText);

  return (
    <Field label="Erklärvideo (YouTube-Link)" htmlFor={`${idPrefix}-video`}>
      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-video`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
        <ExplainerVideoSearchDialog bggId={bggId} onSelect={onChange} />
      </div>
    </Field>
  );
}

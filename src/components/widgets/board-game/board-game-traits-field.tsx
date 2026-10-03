import { BoardGameTrait } from "@prisma/client";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import {
  BOARD_GAME_TRAIT_FALLBACK_LABELS,
  BOARD_GAME_TRAIT_OPTIONS,
} from "@/lib/ludothek/board-game-traits";

/**
 * Mehrfachauswahl der 5 BGG-Family-Traits (#487-Konzept) — Checkbox-Liste
 * statt `MultiSelectCombobox`: anders als Mechaniken/Kategorien ist die Menge
 * fest und klein (5 Werte), keine Autocomplete-Suche nötig. Analog
 * `RuleBookLanguagesField`. `diffTone` rahmt das Feld grün/rot im
 * "Daten mit BGG abgleichen"-Modus (#189), analog den übrigen Feldern dort.
 */
export function BoardGameTraitsField({
  idPrefix,
  value,
  onChange,
  diffTone,
}: {
  idPrefix: string;
  value: BoardGameTrait[];
  onChange: (traits: BoardGameTrait[]) => void;
  diffTone?: boolean;
}) {
  function toggle(trait: BoardGameTrait, checked: boolean) {
    onChange(checked ? [...value, trait] : value.filter((t) => t !== trait));
  }

  return (
    <Field
      label="Traits (BGG-Family-Signale)"
      className={cn(
        diffTone !== undefined && "rounded-md border p-2",
        diffTone === true && "border-emerald-600",
        diffTone === false && "border-red-600",
      )}
    >
      <div className="flex flex-wrap gap-3">
        {BOARD_GAME_TRAIT_OPTIONS.map((trait) => (
          <label
            key={trait}
            htmlFor={`${idPrefix}-trait-${trait}`}
            className="flex items-center gap-1.5 text-sm"
          >
            <input
              type="checkbox"
              id={`${idPrefix}-trait-${trait}`}
              checked={value.includes(trait)}
              onChange={(event) => toggle(trait, event.target.checked)}
            />
            {BOARD_GAME_TRAIT_FALLBACK_LABELS[trait]}
          </label>
        ))}
      </div>
    </Field>
  );
}

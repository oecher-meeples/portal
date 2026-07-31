"use client";

import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { EXPLAINER_EXPERIENCE_LEVEL_LABELS } from "@/lib/utils/format";

const LEVELS = Object.keys(
  EXPLAINER_EXPERIENCE_LEVEL_LABELS,
) as ExplainerExperienceLevel[];

/**
 * Single-select Button-Gruppe statt Dropdown — bei nur drei Stufen liest sich
 * das direkt als Auswahl. Erneutes Klicken der bereits aktiven Stufe hebt die
 * Auswahl auf (onDeselect), wenn das aufrufbar ist — statt eines separaten
 * "Entfernen"-Buttons.
 */
export function ExplainerLevelToggle({
  value,
  onChange,
  onDeselect,
  disabled,
  className,
}: {
  value: ExplainerExperienceLevel | null;
  onChange: (level: ExplainerExperienceLevel) => void;
  onDeselect?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Erfahrungsstufe"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {LEVELS.map((level) => (
        <Button
          key={level}
          type="button"
          size="sm"
          variant={value === level ? "default" : "outline"}
          disabled={disabled}
          onClick={() => (value === level ? onDeselect?.() : onChange(level))}
        >
          {EXPLAINER_EXPERIENCE_LEVEL_LABELS[level]}
        </Button>
      ))}
    </div>
  );
}

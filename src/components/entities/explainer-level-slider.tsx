"use client";

import type { ExplainerExperienceLevel } from "@prisma/client";
import { SegmentedSlider } from "@/components/ui/segmented-slider";
import { EXPLAINER_EXPERIENCE_LEVEL_LABELS } from "@/lib/utils/format";

const LEVEL_OPTIONS = Object.entries(EXPLAINER_EXPERIENCE_LEVEL_LABELS).map(
  ([value, label]) => ({
    value: value as ExplainerExperienceLevel,
    label,
  }),
);

/**
 * Slider variant of the Erfahrungsstufe-Auswahl — for contexts where the
 * value always exists (no deselect-to-null). For the toggle variant with
 * click-to-remove see `ExplainerLevelToggle`.
 */
export function ExplainerLevelSlider({
  value,
  onChange,
  disabled,
  className,
}: {
  value: ExplainerExperienceLevel;
  onChange: (level: ExplainerExperienceLevel) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SegmentedSlider
      options={LEVEL_OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}

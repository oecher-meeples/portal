"use client";

import { IdCombobox } from "@/components/ui/id-combobox";

export type MeepleOption = { id: string; displayName: string };

/**
 * Durchsuchbare Meeple-Auswahl (#274) — ersetzt die unsortierten Listen
 * `MeeplePickerFor` (`game-holding-panel.tsx`) und den "Bei"-Filter-Picker
 * (`ludothek-filter-panel.tsx`). Matched intern per Anzeigename wie das
 * Vorbild `AssignExpansionDialog` — bei zwei gleichnamigen Meeples greift
 * die erste Übereinstimmung.
 */
export function MeepleCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Meeple suchen …",
}: {
  options: MeepleOption[];
  value: string | null;
  onValueChange: (meepleId: string | null) => void;
  placeholder?: string;
}) {
  return (
    <IdCombobox
      options={options.map((option) => ({
        id: option.id,
        label: option.displayName,
      }))}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
    />
  );
}

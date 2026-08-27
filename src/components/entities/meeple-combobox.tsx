"use client";

import { useState } from "react";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";

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
  const [inputValue, setInputValue] = useState("");
  const selectedName =
    options.find((option) => option.id === value)?.displayName ?? null;

  return (
    <Combobox
      items={options.map((option) => option.displayName)}
      value={selectedName}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(name) => {
        const selected = options.find((option) => option.displayName === name);
        onValueChange(selected?.id ?? null);
      }}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxPopup>
        <ComboboxEmpty>Keine Treffer.</ComboboxEmpty>
        <ComboboxList>
          {(name: string) => (
            <ComboboxItem key={name} value={name}>
              {name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

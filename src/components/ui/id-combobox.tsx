"use client";

import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { useControlledComboboxInput } from "@/components/ui/use-controlled-combobox-input";

export type IdOption = { id: string; label: string };

/**
 * Durchsuchbare Auswahl über `{ id, label }`-Optionen, Wert ist die `id`.
 * Fachfrei — die fachlichen Picker (`MeepleCombobox`, `MemberCombobox`, das
 * Zusammenführen-Ziel der Mitwirkenden) legen nur ihre Optionen und ihren
 * Platzhalter fest. Matched intern per Label: bei zwei gleichen Labels greift
 * die erste Übereinstimmung. Der erste Treffer ist beim Tippen hervorgehoben,
 * Enter übernimmt ihn also direkt (#573).
 */
export function IdCombobox({
  options,
  value,
  onValueChange,
  placeholder,
}: {
  options: IdOption[];
  value: string | null;
  onValueChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const selectedLabel =
    options.find((option) => option.id === value)?.label ?? null;
  const [inputValue, setInputValue] = useControlledComboboxInput(selectedLabel);

  return (
    <Combobox
      autoHighlight
      items={options.map((option) => option.label)}
      value={selectedLabel}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(label) => {
        const selected = options.find((option) => option.label === label);
        onValueChange(selected?.id ?? null);
      }}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxPopup>
        <ComboboxEmpty>Keine Treffer.</ComboboxEmpty>
        <ComboboxList>
          {(label: string) => (
            <ComboboxItem key={label} value={label}>
              {label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

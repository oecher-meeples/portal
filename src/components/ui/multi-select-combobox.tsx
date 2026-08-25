"use client";

import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
} from "@/components/ui/combobox";

/** Autocomplete text field with chip-based multi-select — fachfrei, string options only. */
export function MultiSelectCombobox({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel = "Keine Treffer",
  className,
}: {
  id?: string;
  options: string[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  /** Auf die sichtbare Chips-Box durchgereicht — z. B. für eine
   * Abgleichs-Randfarbe im BGG-Vergleichsmodus (#189). */
  className?: string;
}) {
  return (
    <Combobox
      items={options}
      multiple
      value={value}
      onValueChange={onValueChange}
    >
      <ComboboxChips className={className}>
        {value.map((item) => (
          <ComboboxChip key={item}>
            {item}
            <ComboboxChipRemove aria-label={`${item} entfernen`} />
          </ComboboxChip>
        ))}
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          className="h-auto min-w-24 border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </ComboboxChips>
      <ComboboxPopup>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

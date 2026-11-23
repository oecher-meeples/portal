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

export type GameOption = { id: string; title: string };

/**
 * Durchsuchbare Spiel-Auswahl (#409) — analog `MeepleCombobox`, matcht intern
 * per Titel wie das Vorbild.
 */
export function GameCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Spiel suchen …",
}: {
  options: GameOption[];
  value: string | null;
  onValueChange: (boardGameId: string | null) => void;
  placeholder?: string;
}) {
  const selectedTitle =
    options.find((option) => option.id === value)?.title ?? null;
  const [inputValue, setInputValue] = useControlledComboboxInput(selectedTitle);

  return (
    <Combobox
      items={options.map((option) => option.title)}
      value={selectedTitle}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(title) => {
        const selected = options.find((option) => option.title === title);
        onValueChange(selected?.id ?? null);
      }}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxPopup>
        <ComboboxEmpty>Keine Treffer.</ComboboxEmpty>
        <ComboboxList>
          {(title: string) => (
            <ComboboxItem key={title} value={title}>
              {title}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

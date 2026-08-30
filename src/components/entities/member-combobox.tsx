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

export type MemberOption = { id: string; displayName: string };

/**
 * Durchsuchbare Vereinsmitglied-Auswahl (#333) — `games:manage`-only, für "An
 * extern ausgeben" und das Umbuchen vom Sammelkonto. Bewusst eine eigene,
 * kleine Komponente statt `MeepleCombobox` zu verbiegen: die beiden Picker
 * durchsuchen fachlich verschiedene Tabellen (`Member` vs. `Meeple`) — nur das
 * Kombobox-Grundgerüst (Suche/Filter/Popup) ist gleich, das ist bereits in
 * `components/ui/combobox` geteilt, nicht hier zu duplizieren.
 */
export function MemberCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Vereinsmitglied suchen …",
}: {
  options: MemberOption[];
  value: string | null;
  onValueChange: (memberId: string | null) => void;
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

"use client";

import { IdCombobox } from "@/components/ui/id-combobox";

export type MemberOption = { id: string; displayName: string };

/**
 * Durchsuchbare Vereinsmitglied-Auswahl (#333) — `games:manage`-only, für "An
 * extern ausgeben" und das Umbuchen vom Sammelkonto. Bewusst eine eigene,
 * kleine Komponente statt `MeepleCombobox` zu verbiegen: die beiden Picker
 * durchsuchen fachlich verschiedene Tabellen (`Member` vs. `Meeple`) — nur das
 * Kombobox-Grundgerüst (Suche/Filter/Popup) ist gleich, das ist in
 * `components/ui/id-combobox` geteilt, nicht hier zu duplizieren.
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

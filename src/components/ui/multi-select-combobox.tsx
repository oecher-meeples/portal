"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils/cn";

/** Autocomplete text field with chip-based multi-select — fachfrei, string options only.
 * Ausgewählte Werte stehen als eigene Pill-Reihe unter dem Suchfeld statt als
 * Chips im Feld selbst; das Popup bleibt nach einer Auswahl offen (Mehrfach-
 * auswahl), nur echtes Schließen (Escape, Klick außerhalb, …) übernimmt. */
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
  /** Auf das Suchfeld durchgereicht — z. B. für eine Abgleichs-Randfarbe im
   * BGG-Vergleichsmodus (#189). */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Combobox
        items={options}
        multiple
        value={value}
        onValueChange={onValueChange}
        open={open}
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen && eventDetails.reason === "item-press") return;
          setOpen(nextOpen);
        }}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            placeholder={placeholder}
            className={cn(value.length > 0 && "pr-8", className)}
          />
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onValueChange([])}
              aria-label="Alle entfernen"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
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
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onValueChange(value.filter((v) => v !== item))}
              aria-label={`${item} entfernen`}
              className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium"
            >
              {item}
              <span
                aria-hidden
                className="hover:bg-secondary-foreground/10 flex size-4 items-center justify-center rounded-full"
              >
                <XIcon className="size-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

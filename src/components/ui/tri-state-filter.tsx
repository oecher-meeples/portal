"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TriState = "alle" | "nur" | "keine";

const CYCLE: Record<TriState, TriState> = {
  alle: "nur",
  nur: "keine",
  keine: "alle",
};

const SHORT_LABEL: Record<TriState, string> = {
  alle: "Alle",
  nur: "Nur",
  keine: "Keine",
};

/** Drei-Zustands-Filter (Alle/Nur/Keine) für ein boolesches Merkmal. Klick
 * auf den Button wechselt zyklisch durch die Zustände, das Dropdown daneben
 * erlaubt die direkte Auswahl. */
export function TriStateFilter({
  label,
  value,
  onChange,
  itemLabels,
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
  itemLabels: Record<TriState, string>;
}) {
  return (
    <DropdownMenu>
      <div className="border-input inline-flex items-stretch overflow-hidden rounded-full border text-sm">
        <button
          type="button"
          onClick={() => onChange(CYCLE[value])}
          className={cn(
            "px-3 py-1 font-medium transition-colors",
            value === "alle"
              ? "text-muted-foreground hover:text-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {label}: {SHORT_LABEL[value]}
        </button>
        <DropdownMenuTrigger
          aria-label={`${label}-Filter auswählen`}
          className="hover:bg-muted/60 flex items-center border-l px-1.5"
        >
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as TriState)}
        >
          <DropdownMenuRadioItem value="alle">
            {itemLabels.alle}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="nur">
            {itemLabels.nur}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="keine">
            {itemLabels.keine}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type PillOption<T extends string> = {
  label: string;
  value: T;
  icon?: LucideIcon;
};

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Text/Padding schrumpfen stufenlos per `clamp()` (fester Min/Max-Rahmen)
   * statt fixer Größe — für Stellen mit potenziell knappem Platz (z. B.
   * `PreviewTierSwitcher` im Header). Icon-Größe bleibt davon unberührt. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 flex w-fit shrink-0 flex-wrap gap-1 rounded-full border p-1",
        compact ? "text-[clamp(0.6875rem,1.4vw,0.875rem)]" : "text-sm",
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full font-medium transition-colors",
            compact
              ? "px-[clamp(0.5rem,1.2vw,0.75rem)] py-[clamp(0.125rem,0.4vw,0.25rem)]"
              : "px-3 py-1",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.icon && <option.icon className="size-3.5 shrink-0" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

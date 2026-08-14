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
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="bg-muted/40 flex w-fit flex-wrap gap-1 rounded-full border p-1 text-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.icon && <option.icon className="size-3.5" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

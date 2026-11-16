import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** Natives `<select>` im Stil von `Input` — für einfache Auswahllisten
 * (Filter, Sortierung, Vorschläge), wo ein Combobox zu viel wäre. */
export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "border-input bg-background h-8 rounded-lg border px-2.5 text-sm",
        className,
      )}
    />
  );
}

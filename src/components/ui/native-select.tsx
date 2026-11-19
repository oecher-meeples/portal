import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const nativeSelectVariants = cva("border-input bg-background border text-sm", {
  variants: {
    size: {
      /** Wie `Input` in Filterleisten. */
      default: "h-8 rounded-lg px-2.5",
      /** Formularfelder in Dialogen und Abschnitten (#524). */
      md: "h-9 rounded-md px-3",
      /** Dichte Tabellen-/Inline-Auswahl. */
      compact: "h-8 rounded-md px-2 disabled:opacity-60",
    },
  },
  defaultVariants: { size: "default" },
});

/** Natives `<select>` im Stil von `Input` — für einfache Auswahllisten
 * (Filter, Sortierung, Formularfelder), wo ein Combobox zu viel wäre. */
export function NativeSelect({
  className,
  size,
  ...props
}: Omit<ComponentProps<"select">, "size"> &
  VariantProps<typeof nativeSelectVariants>) {
  return (
    <select
      {...props}
      className={cn(nativeSelectVariants({ size }), className)}
    />
  );
}

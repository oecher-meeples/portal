import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Diagonal corner ribbon, e.g. for marking an expansion on a card (#103).
 * Requires the parent to have `relative overflow-hidden` — the ribbon is
 * wider than the corner and gets clipped by that container.
 */
export function RibbonCorner({
  children,
  size = "default",
}: {
  children: ReactNode;
  size?: "default" | "sm";
}) {
  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground absolute top-2 -left-8 z-10 flex -rotate-45 items-center justify-center text-center font-medium whitespace-nowrap",
        size === "sm" ? "w-28 py-0.5 text-[10px]" : "w-36 py-1 text-xs",
      )}
    >
      {children}
    </div>
  );
}

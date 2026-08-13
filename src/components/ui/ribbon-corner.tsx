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
        "bg-primary text-primary-foreground absolute -top-1 -left-6 z-10 flex w-28 -rotate-45 items-center justify-center",
        size === "sm" ? "gap-0.5 py-0 text-[10px]" : "gap-1 py-0.5 text-xs",
      )}
    >
      {children}
    </div>
  );
}

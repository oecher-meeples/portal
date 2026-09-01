import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Diagonal corner ribbon, e.g. for marking an expansion on a card (#103).
 * Requires the parent to have `relative overflow-hidden` — the ribbon is
 * wider than the corner and gets clipped by that container.
 *
 * `xs` is tuned for very small clipping containers (≤~130px, e.g. the list
 * row thumbnail) — `sm`'s width/offsets are sized for the grid card's much
 * wider container and get clipped into a flat, unrotated sliver there
 * (#397).
 */
export function RibbonCorner({
  children,
  size = "default",
}: {
  children: ReactNode;
  size?: "default" | "sm" | "xs";
}) {
  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground absolute z-10 flex -rotate-45 items-center justify-center text-center font-medium whitespace-nowrap",
        size === "xs" && "top-3 -left-6 w-20 py-0.5 text-[9px]",
        size === "sm" && "top-5 -left-10 w-28 py-0.5 text-[10px]",
        size === "default" && "top-5 -left-10 w-36 py-1 text-xs",
      )}
    >
      {children}
    </div>
  );
}

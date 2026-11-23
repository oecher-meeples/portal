"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils/cn";

function Tooltip({
  content,
  children,
  delay = 200,
  side = "top",
}: {
  content: ReactNode;
  children: ReactElement;
  delay?: number;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side={side}
          sideOffset={6}
          collisionPadding={{ top: 72 }}
          // `z-50` on `Popup` alone has no effect — it isn't positioned
          // itself, only `Positioner` is (Floating UI sets `position: fixed`
          // there). Without it here, the tooltip could render behind a
          // `fixed`/`sticky` ancestor with its own z-index — e.g. the
          // header (`z-30`), which hid the Feedback-button tooltip (#282).
          className="z-50"
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            className={cn(
              "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 z-50 rounded-md px-2.5 py-1.5 text-xs ring-1 duration-100",
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip };

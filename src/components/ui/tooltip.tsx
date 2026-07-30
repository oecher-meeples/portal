"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

function Tooltip({
  content,
  children,
  delay = 200,
}: {
  content: ReactNode;
  children: ReactElement;
  delay?: number;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner sideOffset={6}>
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

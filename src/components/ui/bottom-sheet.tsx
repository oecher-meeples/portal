"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

/**
 * Von unten eingeblendetes Sheet — eigene, schlanke Popup-Variante statt der
 * zentrierten `DialogContent` (analog zu `ui/dialog.tsx` aufgebaut, s. auch
 * `mobile-nav.tsx`, das erste Vorkommen dieses Musters). Zweites Vorkommen
 * (News-Kalender), deshalb hier als geteilter Baustein extrahiert (DRY).
 */
function BottomSheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="bottom-sheet" {...props} />;
}

function BottomSheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />
  );
}

function BottomSheetContent({
  className,
  children,
  title,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** Sichtbarer Titel oben im Sheet (auch für Screenreader, `DialogTitle`). */
  title: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="bottom-sheet-content"
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col gap-2 overflow-x-hidden rounded-t-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm ring-1 duration-150 outline-none",
          className,
        )}
        {...props}
      >
        <DialogTitle className="px-2 py-1.5 text-xs font-bold tracking-wider uppercase">
          {title}
        </DialogTitle>
        <div className="overflow-y-auto">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

export { BottomSheet, BottomSheetTrigger, BottomSheetContent };

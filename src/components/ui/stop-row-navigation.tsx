"use client";

import type { ReactNode } from "react";

/**
 * Wraps admin controls placed inside a row/card that's itself a `Link` —
 * stops the click from bubbling into it so opening a dialog or menu doesn't
 * also navigate away. Shared by the grid, list and compact row overlays.
 */
export function StopRowNavigation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className={className}
    >
      {children}
    </div>
  );
}

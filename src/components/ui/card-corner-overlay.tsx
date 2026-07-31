import type { ReactNode } from "react";

const CORNER_CLASSES = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
} as const;

export function CardCornerOverlay({
  corner,
  children,
}: {
  corner: keyof typeof CORNER_CLASSES;
  children: ReactNode;
}) {
  return (
    <div className={`absolute z-10 ${CORNER_CLASSES[corner]}`}>{children}</div>
  );
}

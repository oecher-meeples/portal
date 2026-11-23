import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** Größe ab `sm` — darunter gilt für alle Stufen dieselbe fließende Größe. */
const SIZE_FROM_SM = {
  lg: "sm:text-4xl",
  md: "sm:text-3xl",
  sm: "sm:text-2xl",
} as const;

/**
 * Seitentitel (`<h1>`) mit Umbruchschutz (#581): auf `< sm` fließend
 * 20–26 px (`clamp()`), damit lange Komposita wie „Mitgliederversammlung"
 * auf 360 px in eine Zeile passen, statt abgeschnitten zu werden. Ab `sm`
 * bestimmt `size` die Größe (Desktop unverändert). Umbruch nur zwischen
 * Wörtern; `overflow-wrap: break-word` greift nur als letzte Notbremse,
 * kein `hyphens`, kein `break-all`.
 */
export function PageTitle({
  size = "lg",
  className,
  ...props
}: ComponentProps<"h1"> & { size?: keyof typeof SIZE_FROM_SM }) {
  return (
    <h1
      className={cn(
        "min-w-0 font-serif text-[clamp(1.25rem,6.5vw,1.625rem)] font-bold tracking-tight wrap-break-word max-sm:leading-tight",
        SIZE_FROM_SM[size],
        className,
      )}
      {...props}
    />
  );
}

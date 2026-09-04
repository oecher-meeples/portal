import { cn } from "@/lib/utils/cn";

/**
 * Fachfreier Ladezustand-Platzhalter (#460) — pulsierende, neutrale Fläche
 * für Karten, Zeilen, Textblöcke etc. Form/Größe kommen vollständig über
 * `className` (analog `ui/placeholder-media.tsx`), keine festen Maße hier.
 * `aria-busy` + `role="status"` markieren den Bereich für Screenreader als
 * "lädt gerade", ohne dass jeder Aufrufer das selbst wiederholen muss.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-busy="true"
      aria-label="Lädt…"
      className={cn("bg-muted animate-pulse rounded-md", className)}
    />
  );
}

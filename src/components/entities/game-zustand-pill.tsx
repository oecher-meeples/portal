import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { GameZustand } from "@/lib/ludothek/holdings";

const ZUSTAND_TONE: Record<GameZustand, StatusTone> = {
  frei: "positive",
  ausgeliehen: "info",
  wartung: "warning",
  "nicht-erfasst": "neutral",
};

const ZUSTAND_LABELS: Record<GameZustand, string> = {
  frei: "Frei",
  ausgeliehen: "Ausgeliehen",
  wartung: "Wartung",
  "nicht-erfasst": "Nicht erfasst",
};

/** The one place that knows how a game's Zustand looks. */
export function GameZustandPill({
  zustand,
  className,
}: {
  zustand: GameZustand;
  className?: string;
}) {
  return (
    <StatusPill
      label={ZUSTAND_LABELS[zustand]}
      tone={ZUSTAND_TONE[zustand]}
      className={className}
    />
  );
}

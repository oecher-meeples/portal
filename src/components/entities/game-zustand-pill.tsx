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

/** The one place that knows how a game's Zustand looks. Renders nothing for
 * "nicht-erfasst" — a copy with no recorded holding yet is the default for
 * every game, not information worth a pill (see #121).
 *
 * `count`/`total` add an "X/Y" ratio in front of the label for aggregated
 * titles with mixed-condition copies (#125) — e.g. "1/2 Ausgeliehen". Both
 * must be given and `total` must exceed 1, otherwise the label stays plain,
 * matching the single-copy behaviour from before #125. */
export function GameZustandPill({
  zustand,
  count,
  total,
  className,
}: {
  zustand: GameZustand;
  count?: number;
  total?: number;
  className?: string;
}) {
  if (zustand === "nicht-erfasst") return null;

  const label =
    total !== undefined && total > 1
      ? `${count}/${total} ${ZUSTAND_LABELS[zustand]}`
      : ZUSTAND_LABELS[zustand];

  return (
    <StatusPill
      label={label}
      tone={ZUSTAND_TONE[zustand]}
      className={className}
    />
  );
}

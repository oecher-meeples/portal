/**
 * Beschriftete Balkenzeile (Label links, Wert rechts, darunter ein relativer
 * Balken) — fachfrei, für einfache Rangfolgen/Histogramme ohne Chart-Library
 * (Statistiken, Admin-Analytics). `max` ist der Bezugswert für 100 % Breite.
 */
export function BarRow({
  label,
  value,
  max,
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  /** Angezeigter Wert, falls abweichend von `value` (z. B. "12×", "40 %"). */
  valueLabel?: string;
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 font-medium break-words">{label}</span>
        <span className="text-muted-foreground shrink-0">
          {valueLabel ?? value}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

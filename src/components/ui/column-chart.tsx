export type ColumnChartItem = {
  key: string;
  /** Kurzlabel unter der Säule, z. B. "Nov". */
  label: string;
  value: number;
  /** Angezeigter Wert über der Säule, falls abweichend von `value`. */
  valueLabel?: string;
  /** Ausführliches Label für Screenreader/Tooltip, z. B. "November 2026". */
  srLabel?: string;
};

/**
 * Säulendiagramm ohne Chart-Library (#599) — fachfrei, Server-Komponente,
 * HTML/CSS. Säulenhöhe relativ zum größten Wert, Wert über, Label unter der
 * Säule; passt mit 12 Säulen auf Phone-Breite. Für Screenreader steht
 * dieselbe Information als Tabelle daneben (`sr-only`), das Diagramm selbst
 * ist `aria-hidden`. Gegenstück zu `BarRow` für Zeitreihen.
 */
export function ColumnChart({
  items,
  caption,
  valueHeader = "Anzahl",
  labelHeader = "Zeitraum",
}: {
  items: ColumnChartItem[];
  /** Beschriftung der Screenreader-Tabelle. */
  caption: string;
  valueHeader?: string;
  labelHeader?: string;
}) {
  const max = Math.max(0, ...items.map((item) => item.value));

  return (
    <div>
      {/* `pt-5` hält über der höchsten Säule Platz für ihr Wert-Label. */}
      <div aria-hidden className="flex h-40 gap-1 pt-5 sm:gap-2">
        {items.map((item) => {
          const height = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div
              key={item.key}
              title={`${item.srLabel ?? item.label}: ${item.valueLabel ?? item.value}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center"
            >
              <div
                className="bg-primary relative w-full max-w-10 rounded-t-sm"
                style={{ height: `${height}%`, minHeight: item.value ? 2 : 0 }}
              >
                <span className="text-muted-foreground absolute inset-x-0 bottom-full mb-0.5 text-center text-[10px] tabular-nums sm:text-xs">
                  {item.valueLabel ?? item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-1 flex gap-1 border-t pt-1 sm:gap-2">
        {items.map((item) => (
          <span
            key={item.key}
            className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[10px] sm:text-xs"
          >
            {item.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labelHeader}</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.srLabel ?? item.label}</th>
              <td>{item.valueLabel ?? item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

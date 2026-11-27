import type { ReactNode } from "react";

/** „Gefiltert auf {Wert} · Alle anzeigen“ — Zeile für aktive Filter (/news, Helferplan). */
export function FilterResetRow({
  value,
  onReset,
}: {
  value: ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        Gefiltert auf <strong className="text-foreground">{value}</strong>
      </span>
      <button
        type="button"
        onClick={onReset}
        className="text-primary shrink-0 hover:underline"
      >
        Alle anzeigen
      </button>
    </div>
  );
}

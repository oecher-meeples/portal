"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Überschrift + Liste mit Limit (#599): zeigt die ersten `visibleCount`
 * Einträge, „Alle anzeigen" klappt lokal auf. `hint` erscheint, sobald alles
 * Geladene sichtbar ist — z. B. „Ältere … werden nicht angezeigt.", wenn der
 * Aufrufer selbst schon gekürzt hat. Fachfrei; die Einträge rendert der
 * Aufrufer.
 */
export function HistoryList<T extends { id: string }>({
  title,
  items,
  renderItem,
  visibleCount = 5,
  hint,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  visibleCount?: number;
  hint?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > visibleCount;
  const shown = expanded || !collapsible ? items : items.slice(0, visibleCount);

  return (
    <div>
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <ul className="mt-2 flex flex-col divide-y text-sm">
        {shown.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 py-2">
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {collapsible && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Weniger anzeigen" : `Alle anzeigen (${items.length})`}
        </Button>
      )}
      {hint && shown.length === items.length && (
        <p className="text-muted-foreground mt-2 text-xs">{hint}</p>
      )}
    </div>
  );
}

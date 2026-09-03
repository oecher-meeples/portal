import { useState } from "react";

/**
 * Seiten-State für eine clientseitig gefilterte Tabelle. Springt bei einer
 * neuen Ergebnismenge (Suche/Filter geändert, approximiert über `itemCount`)
 * automatisch auf Seite 1 zurück und rutscht bei einer kleineren `pageCount`
 * (z. B. `pageSize`-Wechsel an einem Breakpoint) auf die letzte gültige
 * Seite. Zustand-während-des-Renders-Muster, kein `useEffect`
 * (s. `use-controlled-combobox-input.ts`).
 */
export function usePagination(itemCount: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const [page, setPage] = useState(0);
  const [trackedItemCount, setTrackedItemCount] = useState(itemCount);

  if (itemCount !== trackedItemCount) {
    setTrackedItemCount(itemCount);
    setPage(0);
  } else if (page > pageCount - 1) {
    setPage(pageCount - 1);
  }

  const start = page * pageSize;

  return { page, pageCount, setPage, start, end: start + pageSize };
}

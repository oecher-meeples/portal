import { useEffect, useState } from "react";

/**
 * Client-persistenter State unter `key` in `localStorage`, JSON-serialisiert
 * (beliebiger Wert, nicht nur boolean). Startet mit `fallback` (SSR-sicher,
 * `localStorage` existiert erst nach Hydration) und liest den gespeicherten
 * Wert einmalig nach dem Mount nach. Jede Änderung wird zurückgeschrieben.
 * `localStorage` kann in Private-Mode oder bei blockiertem Storage werfen,
 * gespeicherte Werte können zudem ungültiges JSON sein — in beiden Fällen
 * bleibt es beim In-Memory-State.
 *
 * `revive` prüft bzw. bereinigt den gelesenen Wert beim Laden (z. B.
 * abgelaufene Log-Einträge, #574). Der Setter nimmt wie `useState` auch eine
 * Update-Funktion, damit aufeinanderfolgende Änderungen nicht auf einem
 * veralteten Stand aufsetzen.
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T,
  revive?: (stored: unknown) => T,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Guard: localStorage ist erst nach Hydration verfügbar, sonst SSR-Markup-Mismatch.
        setValue(revive ? revive(parsed) : (parsed as T));
      }
    } catch {
      // Wert bleibt beim Fallback.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `revive` gehört fest zum Schlüssel, eine neue Funktions-Identität soll nicht neu laden.
  }, [key]);

  function set(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: T) => T)(current)
          : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Persistiert dann halt nicht — State bleibt trotzdem konsistent.
      }
      return resolved;
    });
  }

  return [value, set];
}

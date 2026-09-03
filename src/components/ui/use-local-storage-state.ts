import { useEffect, useState } from "react";

/**
 * Client-persistenter State unter `key` in `localStorage`, JSON-serialisiert
 * (beliebiger Wert, nicht nur boolean). Startet mit `fallback` (SSR-sicher,
 * `localStorage` existiert erst nach Hydration) und liest den gespeicherten
 * Wert einmalig nach dem Mount nach. Jede Änderung wird zurückgeschrieben.
 * `localStorage` kann in Private-Mode oder bei blockiertem Storage werfen,
 * gespeicherte Werte können zudem ungültiges JSON sein — in beiden Fällen
 * bleibt es beim In-Memory-State.
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Guard: localStorage ist erst nach Hydration verfügbar, sonst SSR-Markup-Mismatch.
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Wert bleibt beim Fallback.
    }
  }, [key]);

  function set(next: T) {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Persistiert dann halt nicht — State bleibt trotzdem konsistent.
    }
  }

  return [value, set];
}

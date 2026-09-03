import { useEffect, useState } from "react";

/**
 * Wert, der erst nach der Hydration im Browser feststeht (z. B.
 * `window.location`) und auf dem Server sowie im ersten Client-Render noch
 * nicht existiert. Startet mit `fallback` (SSR-sicher, kein Markup-
 * Mismatch) und zieht `compute()` einmalig nach dem Mount nach. Wirft
 * `compute`, bleibt es beim Fallback.
 */
export function useClientValue<T>(compute: () => T, fallback: T): T {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Guard: Wert ist erst nach Hydration bekannt, sonst SSR-Markup-Mismatch.
      setValue(compute());
    } catch {
      // Wert bleibt beim Fallback.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Nur einmal beim Mount, compute ist bewusst kein Dep.
  }, []);

  return value;
}

import { useEffect, useState } from "react";

/**
 * Ob `query` (z. B. `"(min-width: 768px)"`) aktuell zutrifft — reagiert live
 * auf Breakpoint-Wechsel (Fenster-Resize, Orientierungswechsel), anders als
 * ein einmaliger Mount-Guard. Startet mit `false` (SSR-sicher, `matchMedia`
 * existiert erst im Browser) und synchronisiert direkt nach dem Mount.
 * `matchMedia` fehlt in jsdom (Test-Umgebung) — bleibt dann beim Fallback.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQueryList = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Guard: matchMedia ist erst nach Hydration bekannt, sonst SSR-Markup-Mismatch.
    setMatches(mediaQueryList.matches);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

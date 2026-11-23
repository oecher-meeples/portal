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

/** Unterhalb von Tailwinds `md`-Breakpoint (768 px). */
const BELOW_MD_QUERY = "(max-width: 767.98px)";

/**
 * Ob der Viewport unterhalb von `md` liegt (#585). Startet wie
 * `useMediaQuery` mit `false` — Server und erster Client-Render zeigen also
 * die Desktop-Variante (z. B. die per URL gewählte Ansicht), nach der
 * Hydration korrigiert der Client live bei jedem Breakpoint-Wechsel.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(BELOW_MD_QUERY);
}

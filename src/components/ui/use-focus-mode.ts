"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/components/ui/use-media-query";

/** Attribut am `<html>`, auf das die Tailwind-Variante `focus-mode:` hört
 * (`globals.css`). */
export const FOCUS_MODE_ATTRIBUTE = "data-focus-mode";

/**
 * Fachfreier Fokusmodus-Kanal (#587): Solange aktiv, steht
 * `data-focus-mode` am `<html>`; Header, Bottom-Nav und App-Shell blenden
 * sich per `focus-mode:`-Variante aus bzw. lassen ihre Abstände fallen. So
 * muss eine Seite in `feature/` nichts aus `layout/` importieren.
 *
 * Nur auf `< md` verfügbar: wächst der Viewport darüber, endet der Modus
 * automatisch. Nicht gemerkt — jeder Mount startet normal, beim Unmount
 * (Verlassen der Seite) wird zurückgesetzt.
 */
export function useFocusMode(): {
  available: boolean;
  active: boolean;
  toggle: () => void;
} {
  const isMobile = useIsMobile();
  const [requested, setRequested] = useState(false);
  const active = requested && isMobile;

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.setAttribute(FOCUS_MODE_ATTRIBUTE, "");
    return () => root.removeAttribute(FOCUS_MODE_ATTRIBUTE);
  }, [active]);

  // Endet beim Wechsel auf ≥ md, statt beim Zurückdrehen wieder aufzuleben.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reaktion auf externen Breakpoint-Wechsel (matchMedia), nicht auf eigenen State.
    if (!isMobile) setRequested(false);
  }, [isMobile]);

  return {
    available: isMobile,
    active,
    toggle: () => setRequested((prev) => !prev),
  };
}

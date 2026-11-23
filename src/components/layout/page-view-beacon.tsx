"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const COLLECT_URL = "/api/analytics/collect";

/**
 * Meldet jeden Seitenaufruf (auch Client-Navigationen) per
 * `navigator.sendBeacon` an das In-App-Tracking — Ersatz für
 * `<Analytics />` von Vercel. Gesendet wird nur der Pfad (bewusst ohne
 * Query-String, der Tokens enthalten kann) und beim ersten Aufruf der
 * externe Referrer; `document.referrer` ändert sich bei Client-Navigation
 * nicht, sonst würde er jedem Folgeaufruf erneut zugeschlagen.
 */
export function PageViewBeacon() {
  const pathname = usePathname();
  const lastSentPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastSentPath.current) return;
    if (typeof navigator.sendBeacon !== "function") return;

    const isFirstView = lastSentPath.current === null;
    lastSentPath.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: isFirstView ? document.referrer || null : null,
    });
    navigator.sendBeacon(
      COLLECT_URL,
      new Blob([payload], { type: "application/json" }),
    );
  }, [pathname]);

  return null;
}

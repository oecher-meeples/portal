import { useEffect, useRef, useState } from "react";
import { computeVisibleItems } from "@/lib/utils/visible-items";

/**
 * Infinite scroll over a list, in one of two modes (#468):
 *
 * - **Client-Modus** (default, unverändert seit #135): `items` ist bereits
 *   vollständig geladen, das Sentinel-Erreichen blendet lediglich mehr davon
 *   ein (`initialCount`/`step`). Kein `onLoadMore` nötig.
 * - **Server-Request-Modus**: `onLoadMore` gesetzt — statt `visibleCount`
 *   hochzuzählen, wird beim Sentinel-Erreichen ein echter Nachlade-Request
 *   ausgelöst (`onLoadMore(cursor)`), sofern `hasMore` nicht `false` ist.
 *   `items` wird dann unverändert (ungekürzt) durchgereicht — der Aufrufer
 *   verwaltet die geladene Liste selbst und hängt neue Seiten an.
 *
 * Resetting on a filter change is the caller's job — remount via `key` (see
 * `news-browser.tsx`), rather than this hook diffing `items` internally.
 */
export function useInfiniteScroll<T, C = undefined>(
  items: T[],
  {
    initialCount,
    step,
    onLoadMore,
    cursor,
    hasMore,
  }: {
    initialCount: number;
    step: number;
    /** Server-Request-Modus: wird beim Sentinel-Erreichen aufgerufen, solange
     * `hasMore` nicht `false` ist. Weggelassen → Client-Modus (Default). */
    onLoadMore?: (cursor: C) => void;
    /** Wird unverändert an `onLoadMore` weitergereicht — der aktuelle
     * Nachlade-Cursor liegt beim Aufrufer (z. B. `nextCursor` der letzten
     * Server-Antwort). */
    cursor?: C;
    /** Server-Request-Modus: `false`, sobald der Server keine weiteren
     * Elemente mehr liefert — verhindert weitere `onLoadMore`-Aufrufe. */
    hasMore?: boolean;
  },
) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const isServerMode = onLoadMore !== undefined;
  const isEndReached = isServerMode
    ? hasMore === false
    : visibleCount >= items.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;

      if (isServerMode) {
        // loadingRef verhindert einen zweiten onLoadMore-Aufruf, solange die
        // angeforderte Seite noch unterwegs ist (Sentinel bleibt sichtbar,
        // bis neue Items gerendert sind) — genau einmal pro Nachlade-Schritt.
        if (isEndReached || loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore?.(cursor as C);
        return;
      }

      setVisibleCount((count) => Math.min(items.length, count + step));
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, step, isServerMode, isEndReached, onLoadMore, cursor]);

  // Neue Items sind angekommen → die nächste Seite darf wieder angefragt werden.
  useEffect(() => {
    loadingRef.current = false;
  }, [items.length]);

  return {
    visibleItems: isServerMode
      ? items
      : computeVisibleItems(items, visibleCount),
    sentinelRef,
    isEndReached,
  };
}

import { useEffect, useRef, useState } from "react";
import { computeVisibleItems } from "@/lib/utils/visible-items";

/**
 * Client-side infinite scroll over an already-loaded list — reveals
 * `initialCount` items, then `step` more each time the sentinel enters the
 * viewport. No pagination request: the full list is already in memory (#135).
 *
 * Resetting on a filter change is the caller's job — remount via `key` (see
 * `news-browser.tsx`), rather than this hook diffing `items` internally.
 */
export function useInfiniteScroll<T>(
  items: T[],
  { initialCount, step }: { initialCount: number; step: number },
) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) => Math.min(items.length, count + step));
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, step]);

  return {
    visibleItems: computeVisibleItems(items, visibleCount),
    sentinelRef,
  };
}

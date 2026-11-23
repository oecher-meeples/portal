/** Slices an (already filtered/sorted) list down to the currently visible count — for infinite scroll (#135). Fachfrei, damit `components/ui` das ohne Domänen-Import nutzen kann. Never returns more items than exist. */
export function computeVisibleItems<T>(items: T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}

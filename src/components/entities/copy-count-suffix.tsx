/**
 * Grey "(x2)" suffix behind a title once several copies are folded into one
 * row (Plan-Schritt 8/9) — omitted entirely for exactly one copy. Shared by
 * `GameCard`, `GameListRow` and `GameCompactRow`.
 */
export function CopyCountSuffix({ copyCount }: { copyCount?: number }) {
  if (!copyCount || copyCount <= 1) return null;

  return (
    <span className="text-muted-foreground ml-1 text-sm font-normal">
      (x{copyCount})
    </span>
  );
}

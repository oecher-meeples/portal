import { isValidEan, normaliseEan } from "@/lib/inventory/ean";

/** Normalises one entry for de-duplication — EANs compare by their
 * normalised digits (so "4001504311892" and "4001-5043-11892" match), titles
 * case-insensitively (#186-Folge). */
function dedupeKey(entry: string): string {
  const trimmed = entry.trim();
  return isValidEan(trimmed) ? normaliseEan(trimmed) : trimmed.toLowerCase();
}

/**
 * Merges new entries (from a scan or a CSV upload) into the existing
 * textarea lines, skipping blanks and anything already present — so
 * scanning the same box twice, or a CSV that overlaps already-typed titles,
 * never adds a duplicate line (#186-Folge, "jeder Eintrag nur 1x").
 */
export function mergeBulkImportEntries(
  existing: string[],
  incoming: string[],
): string[] {
  const seen = new Set(existing.map(dedupeKey));
  const merged = [...existing];

  for (const entry of incoming) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = dedupeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

/** Drops duplicate entries from a full list, keeping the first occurrence —
 * the server-side safety net for `mergeBulkImportEntries()`'s client-side
 * dedup (e.g. a manually pasted list with the same title twice). */
export function dedupeBulkImportEntries(entries: string[]): string[] {
  return mergeBulkImportEntries([], entries);
}

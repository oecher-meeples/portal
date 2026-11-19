/** Die Labels der passenden Einträge — ohne Dubletten, deutsch alphabetisch
 * sortiert. Gemeinsamer Kern von `tagLabelsByType` und
 * `contributorNamesByRole` (#526). */
export function sortedUniqueLabels<T>(
  items: readonly T[],
  matches: (item: T) => boolean,
  label: (item: T) => string,
): string[] {
  return [...new Set(items.filter(matches).map(label))].sort((a, b) =>
    a.localeCompare(b, "de"),
  );
}

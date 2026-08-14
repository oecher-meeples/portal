/** Cuts `text` down to `maxLength` characters, breaking at the last space so
 * words stay whole, and appends "…" — for collapsed descriptions like the
 * Ludothek list-row overlay (#143 follow-up). Fachfrei, damit `components/ui`
 * das ohne Domänen-Import nutzen kann. Returns `text` unchanged if it already
 * fits. */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

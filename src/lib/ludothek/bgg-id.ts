export function parseBggId(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

const BGG_LINK_PATTERN =
  /^https?:\/\/(?:www\.)?boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/i;

/** Extrahiert die numerische Thing-ID aus einem BoardGameGeek-Link (Basisspiel oder Erweiterung). */
export function extractBggIdFromLink(input: string): number | null {
  const match = BGG_LINK_PATTERN.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return value > 0 ? value : null;
}

/** Shared by every comma-separated string[] form field (Mechaniken, Verlag,
 * Autor, #205) — parse/format pair between the raw form string and the
 * stored array. */
export function parseCommaSeparatedList(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatCommaSeparatedList(values: string[]): string {
  return values.join(", ");
}

/** The mechanics form field is a comma-separated list, stored as a string array. */
export function parseMechanics(input: string): string[] {
  return parseCommaSeparatedList(input);
}

export function formatMechanics(mechanics: string[]): string {
  return formatCommaSeparatedList(mechanics);
}

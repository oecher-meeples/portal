export function parseBggId(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

/** The mechanics form field is a comma-separated list, stored as a string array. */
export function parseMechanics(input: string): string[] {
  return input
    .split(",")
    .map((mechanic) => mechanic.trim())
    .filter(Boolean);
}

export function formatMechanics(mechanics: string[]): string {
  return mechanics.join(", ");
}

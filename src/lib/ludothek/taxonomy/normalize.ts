export function normalizeTaxonomyName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

export function taxonomyDedupKey(
  bggId: number | null,
  normalizedName: string,
  prefix = "",
): string {
  const base = bggId !== null ? `bgg:${bggId}` : `name:${normalizedName}`;
  return prefix ? `${prefix}:${base}` : base;
}

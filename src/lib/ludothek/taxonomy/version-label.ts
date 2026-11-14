/** Anzeigetext einer Edition für Auswahllisten: Verlage, Sprache(n) und Jahr —
 * fällt auf den Versionsnamen zurück, wenn alles andere fehlt. */
export function describeVersion(version: {
  publishers: string[];
  languages: string[];
  yearPublished: number | null;
  name: string | null;
}): string {
  const parts = [
    version.publishers.join(" / "),
    version.languages.join(", "),
  ].filter(Boolean);
  const base = parts.join(" · ") || version.name || "Edition ohne Angaben";
  return version.yearPublished ? `${base} (${version.yearPublished})` : base;
}

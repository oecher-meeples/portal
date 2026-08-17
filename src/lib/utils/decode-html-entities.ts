const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

/**
 * Dekodiert HTML-Entities in Freitext aus externen APIs — ursprünglich für
 * BGG-Beschreibungen, jetzt auch für YouTube-Videotitel nötig: die YouTube
 * Data API v3 liefert Titel mit HTML-kodierten Sonderzeichen (z. B. "&amp;"
 * statt "&"), da sie ursprünglich für die Einbettung in HTML gedacht sind
 * (#185-Folgeanfrage).
 */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(
      /&amp;|&quot;|&apos;|&lt;|&gt;|&nbsp;|&mdash;|&ndash;|&hellip;/g,
      (match) => HTML_ENTITY_MAP[match],
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

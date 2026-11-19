const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Maskiert Text für die Einbettung in HTML (Mails) — auch Anführungszeichen,
 * weil dieselben Werte in Attributen wie `href="…"` landen. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

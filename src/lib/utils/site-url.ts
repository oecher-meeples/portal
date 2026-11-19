/**
 * Öffentliche Basis-URL des Portals (`PUBLIC_SITE_URL`), ohne Slash am Ende
 * erwartet. Leer, wenn nicht gesetzt — der Link bleibt dann relativ, statt
 * dass Aufrufer (Mails, Newsletter, Kalender-Abo) bei fehlender Konfiguration
 * brechen.
 */
export function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

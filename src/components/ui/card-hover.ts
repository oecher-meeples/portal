/** Gemeinsamer Hover-Zustand für jede klickbare Karte, unabhängig davon, ob
 * sie als `<a>` oder `<button>`/Dialog-Trigger implementiert ist (#393):
 * Anheben, weicher Schatten, Rahmen färbt sich in Akzentfarbe ein. Keine
 * Hintergrund-Tönung mehr (Nutzerentscheidung, #393: nur Border, keine
 * Opacity-Anpassung — die vorherige `bg-primary/[0.04]`-Tönung wich vom
 * Border-only-Stil der Link-Karten ab und sah dadurch uneinheitlich aus,
 * siehe Screenshots im Issue). `relative`, weil z. B. eine Count-Badge
 * absolut darüber positioniert werden kann.
 *
 * Ursprünglich nur für /admin/einstellungen (`SettingsCard`/
 * `SettingsCardButton`), inzwischen von jeder klickbaren Karte im Projekt
 * genutzt (#393) — deshalb hier im fachfreien `ui/`-Layer statt in
 * `feature/admin-settings/`, das laut CLAUDE.md kein anderes
 * `feature/`-Verzeichnis importieren darf. */
export const CARD_HOVER_CLASS =
  "relative transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10";

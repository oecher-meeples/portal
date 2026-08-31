/** Gemeinsamer Hover-Zustand für alle /admin/einstellungen-Karten (Link- und
 * Button-Trigger, `SettingsCard`/`SettingsCardButton`) — dezente
 * Akzentfarb-Tönung statt Rahmen (Nutzerentscheidung: Border zu aufdringlich)
 * plus leichtes Anheben mit weichem Schatten. `relative`, weil die
 * Count-Badge absolut darüber positioniert wird. */
export const SETTINGS_CARD_HOVER_CLASS =
  "relative transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/[0.04] hover:shadow-lg hover:shadow-primary/10";

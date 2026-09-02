/** Gemeinsamer Hover-Zustand für klickbare Karten (Link- und Button-Trigger)
 * — dezente Akzentfarb-Tönung statt Rahmen (Nutzerentscheidung: Border zu
 * aufdringlich) plus leichtes Anheben mit weichem Schatten. `relative`, weil
 * z. B. eine Count-Badge absolut darüber positioniert werden kann.
 * Ursprünglich nur für /admin/einstellungen (`SettingsCard`/
 * `SettingsCardButton`), inzwischen auch von `PrivateCollectionCard` (F9)
 * und `PrivateSpieleSection` (F13) genutzt — deshalb hier im fachfreien
 * `ui/`-Layer statt in `feature/admin-settings/`, das laut CLAUDE.md kein
 * anderes `feature/`-Verzeichnis importieren darf. */
export const CARD_HOVER_CLASS =
  "relative transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/[0.04] hover:shadow-lg hover:shadow-primary/10";

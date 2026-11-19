/**
 * Der Permission-Katalog — einzige Quelle für Permission-Keys (#522).
 * `prisma/seed-roles.ts` legt daraus die `Permission`-Zeilen an, und
 * `hasPermission`/`requirePermission`/die Action-Guards akzeptieren nur
 * `PermissionKey`, damit ein vertippter Key nicht still `false` liefert.
 *
 * Bewusst ohne Server-Abhängigkeiten: der Seed läuft außerhalb von Next.js.
 */
export const PERMISSIONS = [
  {
    key: "admin:access",
    description:
      'Zugriff auf den Admin-Bereich und dessen Tier-Vorschau (ersetzt die frühere Prüfung auf den Rollennamen "admin", siehe src/lib/auth/session.ts)',
  },
  {
    key: "posts:public",
    description:
      "Öffentliche Beiträge anzeigen, bearbeiten und senden (inkl. Instagram-Crosspost, sofern verbunden) — Nachfolger von posts:write (#321)",
  },
  {
    key: "posts:internal",
    description:
      "Interne (vereinsinterne) Beiträge anzeigen, bearbeiten und senden (#321)",
  },
  { key: "posts:delete", description: "Beiträge löschen" },
  {
    key: "invites:manage",
    description: "Einladungen erzeugen, einsehen und widerrufen",
  },
  { key: "members:manage", description: "Mitgliederverwaltung" },
  {
    key: "members:manage-system-accounts",
    description:
      "Meeple-Profile als System-Konto markieren/entmarkieren (#297) — schließt sie aus Mitgliederzählungen aus",
  },
  {
    key: "roles:manage",
    description:
      "Rollen und deren Rechte bearbeiten (#365) — bewusst getrennt von members:manage, damit nicht jeder Mitglieder-Admin auch die Rollenverwaltung selbst ändern kann",
  },
  {
    key: "instagram:connect",
    description: "Instagram-Verbindung verwalten (OAuth verbinden/trennen)",
  },
  {
    key: "games:manage",
    description:
      "Ludothek verwalten: Spiele und Aufbewahrungseinheiten anlegen, bearbeiten und stilllegen, EAN pflegen, Etiketten drucken, fremde Aufenthalte korrigieren, Mängel schließen, deinventarisieren",
  },
  {
    key: "bank:read",
    description: "Bankdaten entschlüsselt einsehen und exportieren",
  },
  {
    key: "events:manage",
    description:
      "Events, Schichten und Regal-Zuordnungen verwalten, Flohmarkt-Artikel freigeben/Kasse bedienen außerhalb einer Kasse-Schicht",
  },
  {
    key: "events:bestand",
    description:
      "Event-Ausgabe und Event-Rückgabe scannen (Regal-Zuordnung beim Verladen) — bewusst eigenständig statt games:manage (#436), engerer Scope als events:manage",
  },
  {
    key: "downloads:manage",
    description:
      "Downloads verwalten (hochladen, Sichtbarkeit ändern, löschen)",
  },
  {
    key: "legal:manage",
    description:
      "Rechtliches-Dokumente verwalten (PDF hochladen, Sections bearbeiten)",
  },
  {
    key: "links:manage",
    description: "Wichtige Links verwalten (anlegen, bearbeiten, löschen)",
  },
  {
    key: "ludothek:view",
    description:
      "Ludothek-Bestand als eingeloggtes Mitglied sehen (Zustand, Standort, Ausleihhistorie) statt nur der öffentlichen Gast-Ansicht",
  },
  {
    key: "ludothek:borrow",
    description:
      "Spiele selbst ausleihen, zurückgeben und weitergeben (Scan-Flow)",
  },
  {
    key: "news:internal:view",
    description: "Interne (vereinsinterne) News-Beiträge lesen",
  },
  {
    key: "lfg:participate",
    description: "Spielergesuche anlegen, beitreten und verwalten",
  },
  {
    key: "market:participate",
    description: "Marktplatz-Angebote anlegen und darauf reagieren",
  },
  {
    key: "notifications:manage",
    description:
      "Globale System-Notifications verwalten: manuelle anlegen/deaktivieren/löschen, automatisierte deaktivieren (#339)",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

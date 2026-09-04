import type { NotificationCloseable, NotificationType } from "./types";

/**
 * Eine im Code hartcodierte automatisierte Notification (#339) — Name, Typ,
 * Zielgruppe, Schließbarkeit und Anzeigetext/-Generator sind fest im Code
 * verdrahtet. Über die CRUD-Seite nur deaktivierbar (siehe
 * `AutomatedNotificationDisable`), nicht inhaltlich bearbeitbar.
 */
export type AutomatedNotificationDefinition = {
  /** Eindeutiger, stabiler Key — identifiziert die Notification sowohl im
   * `AutomatedNotificationDisable`-Flag als auch als `localStorage`-Id
   * (`automated:<name>`). Nie ändern, ohne das Deaktivierungs-Flag und
   * bereits gespeicherte Schließen-Einträge nachzuziehen. */
  name: string;
  type: NotificationType;
  /** `undefined` = für alle sichtbar (auch Gäste). */
  audiencePermissionKey?: string;
  closeable: NotificationCloseable;
  /** Auslösebedingung — z. B. "DB-Füllstand > X%". */
  isTriggered: () => Promise<boolean>;
  /** Anzeigetext, ggf. dynamisch generiert. */
  message: () => Promise<string> | string;
};

/**
 * Konkrete erste automatisierte Notifications (DB-Füllstand, verdächtige
 * Logins) sind eigene Folge-Issues (siehe #339) — diese Registry ist daher
 * bewusst leer. Die Infrastruktur (Deaktivierungs-Flag, Merge mit manuellen
 * Notifications, CRUD-Anzeige) steht bereits; ein Folge-Issue fügt hier nur
 * einen weiteren Eintrag hinzu.
 */
export const AUTOMATED_NOTIFICATIONS: AutomatedNotificationDefinition[] = [];

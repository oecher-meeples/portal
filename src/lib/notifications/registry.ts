import type { NotificationCloseable, NotificationType } from "./types";
import { EXPLAINER_ATTENDANCE_REMINDER } from "@/lib/explainer/attendance-reminder";

/** Wer gerade schaut — für Notifications, deren Auslöser vom Betrachter
 * abhängt (#338: nur Erklärbären ohne heutige Anmeldung). `meepleId` ist
 * `null` für Gäste. */
export type NotificationViewer = {
  permissionKeys: readonly string[];
  meepleId: string | null;
};

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
  isTriggered: (viewer: NotificationViewer) => Promise<boolean>;
  /** Anzeigetext, ggf. dynamisch generiert. */
  message: (viewer: NotificationViewer) => Promise<string> | string;
};

/**
 * Weitere automatisierte Notifications (DB-Füllstand, verdächtige Logins)
 * sind eigene Folge-Issues (siehe #339) — ein Folge-Issue fügt hier nur
 * einen weiteren Eintrag hinzu.
 */
export const AUTOMATED_NOTIFICATIONS: AutomatedNotificationDefinition[] = [
  EXPLAINER_ATTENDANCE_REMINDER,
];

/** Fachvokabular fürs globale Notification-System (#339) — lower-case
 * String-Unions statt der Prisma-Enums direkt, analog `ContentType` &co.,
 * damit `components/**` nicht `@prisma/client` importieren muss. */
export type NotificationType = "info" | "warning" | "danger";
export type NotificationCloseable = "no" | "temporary" | "yes";

/** Eine aktuell aktive, für den jeweiligen Betrachter sichtbare Notification
 * — egal ob manuell (DB) oder automatisiert (Code-Registry). `id` ist
 * stabil für `localStorage`-Tracking im Banner (#339): `manual:<cuid>` bzw.
 * `automated:<registry-key>`. */
export type ActiveNotification = {
  id: string;
  type: NotificationType;
  closeable: NotificationCloseable;
  message: string;
};

/** Dringlichkeits-Rang, höher = dringender — bestimmt sowohl die Banner-
 * Auswahl (dringendste zuerst) als auch die Glocken-Farbe (höchste unter
 * allen aktiven). */
const URGENCY_RANK: Record<NotificationType, number> = {
  danger: 2,
  warning: 1,
  info: 0,
};

export function mostUrgentType(
  notifications: readonly Pick<ActiveNotification, "type">[],
): NotificationType | null {
  if (notifications.length === 0) return null;
  return notifications.reduce<NotificationType>(
    (mostUrgent, notification) =>
      URGENCY_RANK[notification.type] > URGENCY_RANK[mostUrgent]
        ? notification.type
        : mostUrgent,
    notifications[0].type,
  );
}

/** Dringendste Notification aus `notifications` — für den Banner, der nur
 * eine gleichzeitig zeigt (#339). `null` bei leerer Liste. */
export function mostUrgentNotification(
  notifications: readonly ActiveNotification[],
): ActiveNotification | null {
  if (notifications.length === 0) return null;
  return notifications.reduce((mostUrgent, notification) =>
    URGENCY_RANK[notification.type] > URGENCY_RANK[mostUrgent.type]
      ? notification
      : mostUrgent,
  );
}

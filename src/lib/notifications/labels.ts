import type { NotificationCloseable, NotificationType } from "./types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: "Info",
  warning: "Warnung",
  danger: "Kritisch",
};

export const NOTIFICATION_CLOSEABLE_LABELS: Record<
  NotificationCloseable,
  string
> = {
  no: "Nicht schließbar",
  temporary: "Schließbar (kommt nach 18 h zurück)",
  yes: "Schließbar (dauerhaft)",
};

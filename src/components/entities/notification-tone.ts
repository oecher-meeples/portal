import type { StatusTone } from "@/components/ui/status-pill";
import type { NotificationType } from "@/lib/notifications/types";

/** Die eine Stelle, die weiß, wie eine Notification-Dringlichkeit aussieht
 * (#339) — Banner und Glocke greifen beide hierauf zu, statt je eine eigene
 * Farb-Map zu pflegen. */
export const NOTIFICATION_STATUS_TONE: Record<NotificationType, StatusTone> = {
  info: "info",
  warning: "warning",
  danger: "negative",
};

export const NOTIFICATION_BANNER_CLASS: Record<NotificationType, string> = {
  info: "bg-sky-500/10 text-sky-900 dark:text-sky-200 border-sky-500/30",
  warning:
    "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/30",
};

export const NOTIFICATION_ICON_CLASS: Record<NotificationType, string> = {
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

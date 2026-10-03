import {
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { BoardGameTraitTone } from "@prisma/client";
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

export const NOTIFICATION_TONE_ICON: Record<NotificationType, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  danger: OctagonAlert,
};

/** `BoardGameTraitTone` (DB-Enum) → `NotificationType` (Banner-Farbcode) —
 * vermeidet eine zweite Farb-Map, beide kennen exakt dieselben drei
 * Dringlichkeiten (#487-Konzept). Geteilt zwischen dem Verleih-Warnbanner
 * (`ausleihe-view.tsx`) und dem Admin-Formular für Trait-Texte. */
export const BOARD_GAME_TRAIT_TONE_TO_NOTIFICATION_TYPE: Record<
  BoardGameTraitTone,
  NotificationType
> = {
  [BoardGameTraitTone.INFO]: "info",
  [BoardGameTraitTone.WARNING]: "warning",
  [BoardGameTraitTone.DANGER]: "danger",
};

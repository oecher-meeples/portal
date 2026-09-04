import { prisma } from "@/lib/utils/prisma";
import { AUTOMATED_NOTIFICATIONS } from "@/lib/notifications/registry";
import type {
  ActiveNotification,
  NotificationCloseable,
  NotificationType,
} from "@/lib/notifications/types";

const TYPE_TO_DB: Record<NotificationType, "INFO" | "WARNING" | "DANGER"> = {
  info: "INFO",
  warning: "WARNING",
  danger: "DANGER",
};
const DB_TO_TYPE: Record<"INFO" | "WARNING" | "DANGER", NotificationType> = {
  INFO: "info",
  WARNING: "warning",
  DANGER: "danger",
};
const CLOSEABLE_TO_DB: Record<
  NotificationCloseable,
  "NO" | "TEMPORARY" | "YES"
> = { no: "NO", temporary: "TEMPORARY", yes: "YES" };
const DB_TO_CLOSEABLE: Record<
  "NO" | "TEMPORARY" | "YES",
  NotificationCloseable
> = { NO: "no", TEMPORARY: "temporary", YES: "yes" };

function isVisibleToViewer(
  audiencePermissionKey: string | null,
  permissionKeys: readonly string[],
): boolean {
  return (
    audiencePermissionKey === null ||
    permissionKeys.includes(audiencePermissionKey)
  );
}

/**
 * Aktive, für den aktuellen Betrachter sichtbare Notifications — manuelle
 * (DB) und automatisierte (Code-Registry, siehe `registry.ts`) gemischt.
 * Serverseitig bereits nach Zielgruppe gefiltert; welche davon der Banner
 * anzeigt (dringendste, ungeschlossene) und welche die Glocke (alle)
 * entscheidet der Client anhand von `localStorage` (#339).
 */
export async function listActiveNotificationsForViewer(
  permissionKeys: readonly string[],
): Promise<ActiveNotification[]> {
  const manualRows = await prisma.systemNotification.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const manual: ActiveNotification[] = manualRows
    .filter((row) =>
      isVisibleToViewer(row.audiencePermissionKey, permissionKeys),
    )
    .map((row) => ({
      id: `manual:${row.id}`,
      type: DB_TO_TYPE[row.type],
      closeable: DB_TO_CLOSEABLE[row.closeable],
      message: row.message,
    }));

  const eligible = AUTOMATED_NOTIFICATIONS.filter((definition) =>
    isVisibleToViewer(definition.audiencePermissionKey ?? null, permissionKeys),
  );
  const automated: ActiveNotification[] = [];
  if (eligible.length > 0) {
    const disabled = await prisma.automatedNotificationDisable.findMany({
      where: { name: { in: eligible.map((definition) => definition.name) } },
      select: { name: true },
    });
    const disabledNames = new Set(disabled.map((row) => row.name));

    for (const definition of eligible) {
      if (disabledNames.has(definition.name)) continue;
      if (!(await definition.isTriggered())) continue;
      automated.push({
        id: `automated:${definition.name}`,
        type: definition.type,
        closeable: definition.closeable,
        message: await definition.message(),
      });
    }
  }

  return [...manual, ...automated];
}

export { TYPE_TO_DB, DB_TO_TYPE, CLOSEABLE_TO_DB, DB_TO_CLOSEABLE };

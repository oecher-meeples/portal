import { requireAdminPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { AUTOMATED_NOTIFICATIONS } from "@/lib/notifications/registry";
import { DB_TO_TYPE, DB_TO_CLOSEABLE } from "@/lib/notifications/queries";
import {
  AdminNotificationsView,
  type AutomatedNotificationRow,
  type ManualNotificationRow,
} from "@/components/feature/admin-notifications/admin-notifications-view";

export default async function AdminNotificationsPage() {
  await requireAdminPermission("notifications:manage");

  const [manualRows, permissions, disabledRows] = await Promise.all([
    prisma.systemNotification.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.permission.findMany({
      orderBy: { key: "asc" },
      select: { key: true, description: true },
    }),
    prisma.automatedNotificationDisable.findMany({ select: { name: true } }),
  ]);
  const disabledNames = new Set(disabledRows.map((row) => row.name));

  const manual: ManualNotificationRow[] = manualRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: DB_TO_TYPE[row.type],
    audiencePermissionKey: row.audiencePermissionKey,
    closeable: DB_TO_CLOSEABLE[row.closeable],
    message: row.message,
    isActive: row.isActive,
  }));

  const automated: AutomatedNotificationRow[] = AUTOMATED_NOTIFICATIONS.map(
    (definition) => ({
      name: definition.name,
      type: definition.type,
      audiencePermissionKey: definition.audiencePermissionKey ?? null,
      closeable: definition.closeable,
      isDisabled: disabledNames.has(definition.name),
    }),
  );

  return (
    <AdminNotificationsView
      manual={manual}
      automated={automated}
      permissions={permissions}
    />
  );
}

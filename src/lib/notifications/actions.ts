"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { AUTOMATED_NOTIFICATIONS } from "@/lib/notifications/registry";
import { TYPE_TO_DB, CLOSEABLE_TO_DB } from "@/lib/notifications/queries";
import type {
  NotificationCloseable,
  NotificationType,
} from "@/lib/notifications/types";

async function requireManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "notifications:manage"))) {
    return { error: "Keine Berechtigung." } as const;
  }
  return null;
}

function revalidateNotificationPaths() {
  // #339: Banner/Glocke laufen über AppShell, betrifft also jede Seite.
  revalidatePath("/", "layout");
  revalidatePath("/admin/notifications");
}

export type ManualNotificationInput = {
  name: string;
  type: NotificationType;
  audiencePermissionKey: string | null;
  closeable: NotificationCloseable;
  message: string;
};

export async function createManualNotification(input: ManualNotificationInput) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.systemNotification.create({
    data: {
      name: input.name,
      type: TYPE_TO_DB[input.type],
      audiencePermissionKey: input.audiencePermissionKey,
      closeable: CLOSEABLE_TO_DB[input.closeable],
      message: input.message,
    },
  });

  revalidateNotificationPaths();
  return { success: true as const };
}

export async function setManualNotificationActive(
  id: string,
  isActive: boolean,
) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.systemNotification.update({ where: { id }, data: { isActive } });

  revalidateNotificationPaths();
  return { success: true as const };
}

export async function deleteManualNotification(id: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.systemNotification.delete({ where: { id } });

  revalidateNotificationPaths();
  return { success: true as const };
}

/** Deaktiviert/reaktiviert eine automatisierte Notification (#339) — der
 * Code (Registry-Eintrag) bleibt dabei unverändert, nur das persistierte
 * Flag entscheidet, ob sie trotz erfüllter Auslösebedingung angezeigt wird. */
export async function setAutomatedNotificationDisabled(
  name: string,
  disabled: boolean,
) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;
  if (!AUTOMATED_NOTIFICATIONS.some((definition) => definition.name === name)) {
    return { error: "Unbekannte automatisierte Notification." };
  }

  if (disabled) {
    await prisma.automatedNotificationDisable.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  } else {
    await prisma.automatedNotificationDisable.deleteMany({ where: { name } });
  }

  revalidateNotificationPaths();
  return { success: true as const };
}

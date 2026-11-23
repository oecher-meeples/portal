import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import type { PermissionKey } from "@/lib/auth/permission-keys";

export type { PermissionKey } from "@/lib/auth/permission-keys";

/**
 * A UserRole assignment is active at `now` when its time window
 * [startsAt, endsAt) covers it — used to filter permission checks so an
 * expired assignment (e.g. a term of office, see #264) no longer grants
 * anything, without deleting or hiding the row itself (audit trail).
 */
function activeAssignmentWhere(now: Date) {
  return {
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  };
}

/**
 * All permission keys granted to a user's active roles — drives nav
 * visibility and every `hasPermission` check. `cache()` memoises it per
 * request (#525): a page with several guards/permission checks costs one
 * query instead of one `count` per key.
 */
export const getUserPermissionKeys = cache(async function getUserPermissionKeys(
  neonAuthUserId: string,
): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: {
      role: {
        users: {
          some: { neonAuthUserId, ...activeAssignmentWhere(new Date()) },
        },
      },
    },
    select: { permission: { select: { key: true } } },
  });
  return rows.map((row) => row.permission.key);
});

export async function hasPermission(
  neonAuthUserId: string,
  permissionKey: PermissionKey,
) {
  return (await getUserPermissionKeys(neonAuthUserId)).includes(permissionKey);
}

/**
 * Page/route guard: login + permission, redirects otherwise. Prüft bewusst
 * keinen Mitgliedsstatus — Server Actions nehmen `requireActionPermission`
 * (`lib/auth/action-guards.ts`), Admin-Seiten `requireAdminPermission`.
 */
export async function requirePermission(permissionKey: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowed = await hasPermission(user.id, permissionKey);
  if (!allowed) {
    redirect("/403");
  }

  return user;
}

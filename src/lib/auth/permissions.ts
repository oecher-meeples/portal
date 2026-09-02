import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";

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

export async function hasPermission(
  neonAuthUserId: string,
  permissionKey: string,
) {
  const count = await prisma.rolePermission.count({
    where: {
      permission: { key: permissionKey },
      role: {
        users: {
          some: { neonAuthUserId, ...activeAssignmentWhere(new Date()) },
        },
      },
    },
  });
  return count > 0;
}

/** All permission keys granted to a user's active roles — used to drive nav visibility. */
export async function getUserPermissionKeys(
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
}

export async function requirePermission(permissionKey: string) {
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

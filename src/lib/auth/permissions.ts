import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";

export async function hasPermission(
  neonAuthUserId: string,
  permissionKey: string,
) {
  const count = await prisma.rolePermission.count({
    where: {
      permission: { key: permissionKey },
      role: { users: { some: { neonAuthUserId } } },
    },
  });
  return count > 0;
}

/** All permission keys granted to a user's role — used to drive nav visibility. */
export async function getUserPermissionKeys(
  neonAuthUserId: string,
): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: { role: { users: { some: { neonAuthUserId } } } },
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

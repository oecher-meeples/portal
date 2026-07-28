import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

export async function hasRole(neonAuthUserId: string, roleName: string) {
  const count = await prisma.userRole.count({
    where: { neonAuthUserId, role: { name: roleName } },
  });
  return count > 0;
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

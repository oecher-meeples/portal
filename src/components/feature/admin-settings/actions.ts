"use server";

import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";

export async function disconnectInstagram() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "instagram:connect"))) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.instagramConnection.deleteMany();
  return { success: true as const };
}

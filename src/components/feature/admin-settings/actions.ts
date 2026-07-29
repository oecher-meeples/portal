"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";

export async function disconnectInstagram() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "instagram:connect"))) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.instagramConnection.deleteMany();
  return { success: true as const };
}

import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";

export async function requireGamesManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "games:manage"))) {
    return null;
  }
  return user;
}

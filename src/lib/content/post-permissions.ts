import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { type PostPermissions } from "@/lib/content/post-access";

export { canManagePostType, type PostPermissions } from "@/lib/content/post-access";

export async function getPostPermissions(
  userId: string,
): Promise<PostPermissions> {
  const [canEditPublic, canEditInternal] = await Promise.all([
    hasPermission(userId, "posts:public"),
    hasPermission(userId, "posts:internal"),
  ]);
  return { canEditPublic, canEditInternal };
}

/** Zutrittsvoraussetzung für die drei `/admin/news`-Seiten: mindestens eines
 * der beiden Rechte, sonst redirect wie bei `requirePermission()`. */
export async function requirePostPermissions(): Promise<
  PostPermissions & {
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  }
> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perms = await getPostPermissions(user.id);
  if (!perms.canEditPublic && !perms.canEditInternal) redirect("/403");

  return { user, ...perms };
}

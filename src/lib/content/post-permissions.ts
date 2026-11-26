import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { findActionActor } from "@/lib/auth/action-guards";
import { hasPermission } from "@/lib/auth/permissions";
import { UserFacingError } from "@/lib/utils/action-result";
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

/** Guard für Upload-Actions: mindestens eines der beiden Beitragsrechte,
 * sonst Fehler (Upload-Aktionen werfen statt ein Ergebnis-Objekt zu liefern). */
export async function requirePostEditor(): Promise<PostPermissions> {
  const user = (await findActionActor(["posts:public", "posts:internal"]))
    ?.user;
  const perms = user ? await getPostPermissions(user.id) : null;
  if (!perms || (!perms.canEditPublic && !perms.canEditInternal)) {
    throw new UserFacingError("Keine Berechtigung.");
  }
  return perms;
}

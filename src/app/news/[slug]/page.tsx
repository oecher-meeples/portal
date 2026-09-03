import { notFound, redirect } from "next/navigation";
import { canViewContentItem, getContentBySlug } from "@/lib/content/content";
import { canManagePostType } from "@/lib/content/post-access";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { hasPermissionInCurrentView } from "@/lib/auth/session";
import { PostDetailView } from "@/components/feature/news/post-detail-view";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getContentBySlug(slug);
  if (!item) notFound();

  const user = await getCurrentUser();

  // #424: keine öffentlichen Umfragen — nur Meeple sind abstimmungsberechtigt.
  // Gilt unabhängig vom internal-Flag, deshalb vor dem canViewContentItem-Check.
  if (item.type === "umfrage" && !user) redirect("/news");

  const canViewInternal = user
    ? await hasPermission(user.id, "news:internal:view")
    : false;
  if (!canViewContentItem(item, canViewInternal)) notFound();

  const [canEditPublic, canEditInternal] = user
    ? await Promise.all([
        hasPermissionInCurrentView(user.id, "posts:public"),
        hasPermissionInCurrentView(user.id, "posts:internal"),
      ])
    : [false, false];
  const canEdit = canManagePostType(
    { canEditPublic, canEditInternal },
    item.internal,
  );

  return <PostDetailView item={item} canEdit={canEdit} />;
}

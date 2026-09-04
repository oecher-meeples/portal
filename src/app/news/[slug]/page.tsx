import { notFound, redirect } from "next/navigation";
import { getContentBySlug } from "@/lib/content/content";
import { canViewContentItem } from "@/lib/content/content-types";
import { canManagePostType } from "@/lib/content/post-access";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";
import { PostDetailView } from "@/components/feature/news/post-detail-view";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getContentBySlug(slug);
  if (!item) notFound();

  const [user, sessionTier] = await Promise.all([
    getCurrentUser(),
    getSessionTier(),
  ]);

  // #424: keine öffentlichen Umfragen — nur Meeple sind abstimmungsberechtigt.
  // Gilt unabhängig vom internal-Flag, deshalb vor dem canViewContentItem-Check.
  // sessionTier statt bloßer Login-Prüfung, damit ein Admin in der
  // Gäste-Vorschau ebenfalls umgeleitet wird (echter Admin bleibt sonst
  // eingeloggt, auch wenn er "als Gast" vorschaut).
  if (item.type === "umfrage" && !tierAtLeast(sessionTier, "mitglied")) {
    redirect("/news");
  }

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

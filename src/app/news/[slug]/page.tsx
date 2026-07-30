import { notFound } from "next/navigation";
import { canViewContentItem, getContentBySlug } from "@/lib/content/content";
import { getCurrentUser } from "@/lib/auth/server";
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
  if (!canViewContentItem(item, user !== null)) notFound();

  const canEdit = user
    ? await hasPermissionInCurrentView(user.id, "posts:write")
    : false;

  return <PostDetailView item={item} canEdit={canEdit} />;
}

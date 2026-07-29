import { notFound } from "next/navigation";
import { canViewContentItem, getContentBySlug } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth/server";
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

  return <PostDetailView item={item} />;
}

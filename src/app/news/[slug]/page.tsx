import { notFound } from "next/navigation";
import { getAllContent, getContentBySlug } from "@/lib/content";
import { PostDetailView } from "@/components/feature/news/post-detail-view";

export async function generateStaticParams() {
  const items = await getAllContent();
  return items.map((item) => ({ slug: item.slug }));
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getContentBySlug(slug);
  if (!item) notFound();

  return <PostDetailView item={item} />;
}

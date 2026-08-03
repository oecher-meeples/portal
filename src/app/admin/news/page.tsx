import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import {
  AdminNewsView,
  type AdminNewsPostRow,
} from "@/components/feature/admin-news/admin-news-view";

export default async function AdminNewsPage() {
  await requirePermission("posts:write");

  const posts = await prisma.post.findMany({ orderBy: { date: "desc" } });

  const rows: AdminNewsPostRow[] = posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    type: post.type,
    date: post.date.toISOString().slice(0, 10),
    internal: post.internal,
    instagram: post.instagram,
    status: post.status,
  }));

  return <AdminNewsView posts={rows} />;
}

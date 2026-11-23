import { requirePostPermissions } from "@/lib/content/post-permissions";
import { prisma } from "@/lib/utils/prisma";
import {
  AdminNewsView,
  type AdminNewsPostRow,
} from "@/components/feature/admin-news/admin-news-view";

export default async function AdminNewsPage() {
  const { canEditPublic, canEditInternal } = await requirePostPermissions();

  // posts:internal sieht auch öffentliche Beiträge (asymmetrisch — nicht
  // schützenswert); posts:public-only bekommt interne Beiträge serverseitig
  // nie aus der Query (#321), nicht nur clientseitig versteckt.
  const posts = await prisma.post.findMany({
    where: canEditInternal
      ? {}
      : { OR: [{ internal: null }, { internal: false }] },
    orderBy: { date: "desc" },
  });

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

  return (
    <AdminNewsView
      posts={rows}
      canEditPublic={canEditPublic}
      canEditInternal={canEditInternal}
    />
  );
}

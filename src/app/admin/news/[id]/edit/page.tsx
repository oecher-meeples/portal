import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/feature/admin-news/post-form";

const DB_TO_TYPE = {
  BLOG: "blog",
  TERMIN: "termin",
  TURNIER: "turnier",
} as const;

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("posts:write");
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Redaktion" title="Beitrag bearbeiten" />
      <PostForm
        postId={post.id}
        initialValues={{
          type: DB_TO_TYPE[post.type],
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          date: post.date.toISOString().slice(0, 10),
          author: post.author ?? undefined,
        }}
      />
    </div>
  );
}

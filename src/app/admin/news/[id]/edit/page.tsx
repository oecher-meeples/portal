import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import {
  canManagePostType,
  requirePostPermissions,
} from "@/lib/content/post-permissions";
import { prisma } from "@/lib/utils/prisma";
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
  const { canEditPublic, canEditInternal } = await requirePostPermissions();
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: { instagramDetails: { select: { status: true } } },
  });
  if (!post) notFound();
  // Direkter URL-Aufruf des jeweils falschen Beitragstyps (#321): wer nur
  // posts:public hat, darf keinen internen Beitrag öffnen und umgekehrt.
  if (!canManagePostType({ canEditPublic, canEditInternal }, post.internal)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Redaktion" title="Beitrag bearbeiten" />
      <PostForm
        postId={post.id}
        canEditPublic={canEditPublic}
        canEditInternal={canEditInternal}
        initialValues={{
          type: DB_TO_TYPE[post.type],
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          date: post.date.toISOString().slice(0, 10),
          author: post.author ?? undefined,
          internal: post.internal ?? undefined,
          instagram: post.instagram ?? undefined,
          status: post.status,
          sendAsNewsletter: post.sendAsNewsletter,
          newsletterCategory: post.newsletterCategory,
          coverImageUrl: post.coverImageUrl ?? undefined,
          instagramStatus: post.instagramDetails?.status,
        }}
      />
    </div>
  );
}

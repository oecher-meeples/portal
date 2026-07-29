import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getLfgStatus } from "@/lib/lfg";
import { LfgDetailView } from "@/components/feature/lfg/lfg-detail-view";

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, meeple } = await requireMember();
  const { id } = await params;

  const post = await prisma.lfgPost.findUnique({
    where: { id },
    include: {
      participants: { include: { meeple: { select: { displayName: true } } } },
    },
  });
  if (!post) notFound();

  const canManageMembers = await hasPermission(user.id, "members:manage");

  return (
    <LfgDetailView
      id={post.id}
      title={post.title}
      gameTitle={post.gameTitle}
      dateLabel={
        post.plannedAt
          ? dateFormatter.format(post.plannedAt)
          : (post.dateNote ?? "Termin offen")
      }
      location={post.location}
      description={post.description}
      status={getLfgStatus(post, post.participants.length)}
      maxParticipants={post.maxParticipants}
      participants={post.participants.map((p) => ({
        meepleId: p.meepleId,
        displayName: p.meeple.displayName,
      }))}
      createdByMeepleId={post.createdByMeepleId}
      viewerMeepleId={meeple.id}
      canClose={post.createdByMeepleId === meeple.id || canManageMembers}
    />
  );
}

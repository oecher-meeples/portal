import { notFound } from "next/navigation";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { getLfgStatus } from "@/lib/content/lfg";
import { LfgDetailView } from "@/components/feature/lfg/lfg-detail-view";
import { formatDateMedium } from "@/lib/utils/format";

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

  const canManageMembers = await hasPermissionInCurrentView(
    user.id,
    "members:manage",
  );

  return (
    <LfgDetailView
      id={post.id}
      title={post.title}
      gameTitle={post.gameTitle}
      dateLabel={
        post.plannedAt
          ? formatDateMedium(post.plannedAt)
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

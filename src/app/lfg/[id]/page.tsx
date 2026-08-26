import { notFound } from "next/navigation";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { getLfgParticipantDisplayName, getLfgStatus } from "@/lib/content/lfg";
import { getContactLinks } from "@/lib/members/contact";
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
      participants: {
        include: {
          meeple: {
            select: {
              displayName: true,
              email: true,
              telegramHandle: true,
              signalHandle: true,
              discordHandle: true,
              address: true,
              shareAddress: true,
            },
          },
          addedBy: { select: { displayName: true } },
        },
      },
    },
  });
  if (!post) notFound();

  const canManageMembers = await hasPermissionInCurrentView(
    user.id,
    "members:manage",
  );
  const isCreator = post.createdByMeepleId === meeple.id;
  // Kontaktdaten (#167) nur für beigetretene Betrachter — serverseitig
  // abgesichert, nicht nur clientseitig ausgeblendet: wer nicht beigetreten
  // ist, bekommt für jeden Teilnehmer `contact: null` mitgegeben.
  const viewerIsParticipant = post.participants.some(
    (p) => p.meepleId === meeple.id,
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
        id: p.id,
        meepleId: p.meepleId,
        displayName: getLfgParticipantDisplayName({
          meepleId: p.meepleId,
          meepleDisplayName: p.meeple?.displayName,
          addedByDisplayName: p.addedBy.displayName,
        }),
        contact:
          p.meepleId !== null && viewerIsParticipant && p.meeple
            ? getContactLinks(p.meeple)
            : null,
        canRemove:
          p.meepleId === null && (p.addedByMeepleId === meeple.id || isCreator),
      }))}
      createdByMeepleId={post.createdByMeepleId}
      viewerMeepleId={meeple.id}
      canClose={isCreator || canManageMembers}
      guestsMayBringGuests={post.guestsMayBringGuests}
    />
  );
}

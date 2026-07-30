import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { PageHeading } from "@/components/ui/page-heading";
import { getLfgStatus } from "@/lib/content/lfg";
import {
  LfgList,
  type LfgPostSummary,
} from "@/components/feature/lfg/lfg-list";
import { CreateLfgDialog } from "@/components/feature/lfg/create-lfg-dialog";
import { formatDateMedium } from "@/lib/utils/format";

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<{ vergangene?: string }>;
}) {
  const { meeple } = await requireMember();
  const { vergangene } = await searchParams;
  const showExpired = vergangene === "1";

  const posts = await prisma.lfgPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { displayName: true } },
      participants: { select: { meepleId: true } },
    },
  });

  const now = new Date();
  const summaries: LfgPostSummary[] = posts
    .map((post) => ({
      id: post.id,
      title: post.title,
      gameTitle: post.gameTitle,
      dateLabel: post.plannedAt
        ? formatDateMedium(post.plannedAt)
        : (post.dateNote ?? "Termin offen"),
      location: post.location,
      creatorName: post.createdBy.displayName,
      participantCount: post.participants.length,
      maxParticipants: post.maxParticipants,
      status: getLfgStatus(post, post.participants.length, now),
      isParticipant: post.participants.some((p) => p.meepleId === meeple.id),
    }))
    .filter((post) => showExpired || post.status !== "abgelaufen");

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Schwarzes Brett"
        title="Spielergesuche (LFG)"
        description="Finde Mitspielende – für ein bestimmtes Spiel oder einfach spontan für einen Abend."
        action={<CreateLfgDialog />}
      />
      <LfgList
        posts={summaries}
        showingExpired={showExpired}
        showExpiredHref={showExpired ? "/lfg" : "/lfg?vergangene=1"}
      />
    </div>
  );
}

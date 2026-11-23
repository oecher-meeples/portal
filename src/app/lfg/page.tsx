import { requireAdminPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getLfgStatus,
  matchesLfgTimeframeFilter,
  parseLfgSearchParams,
} from "@/lib/content/lfg";
import {
  LfgList,
  type LfgPostSummary,
} from "@/components/feature/lfg/lfg-list";
import { LfgFilterPanel } from "@/components/feature/lfg/lfg-filter-panel";
import { CreateLfgDialog } from "@/components/feature/lfg/create-lfg-dialog";
import { formatDateMedium } from "@/lib/utils/format";

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { meeple } = await requireAdminPermission("lfg:participate");
  const rawSearchParams = await searchParams;
  const filters = parseLfgSearchParams(rawSearchParams);

  const [posts, boardGameOptions] = await Promise.all([
    prisma.lfgPost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { displayName: true } },
        participants: { select: { meepleId: true } },
      },
    }),
    prisma.boardGame.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const now = new Date();
  const summaries: LfgPostSummary[] = posts
    .filter(
      (post) =>
        !filters.boardGameId || post.boardGameId === filters.boardGameId,
    )
    .filter(
      (post) =>
        !filters.zeitraum ||
        matchesLfgTimeframeFilter(post, filters.zeitraum, now),
    )
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
    .filter(
      (post) =>
        !filters.status ||
        (filters.status === "frei" && post.status === "offen") ||
        (filters.status === "voll" && post.status === "voll"),
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Schwarzes Brett"
        title="Spielergesuche (LFG)"
        description="Finde Mitspielende – für ein bestimmtes Spiel oder einfach spontan für einen Abend."
        action={
          <CreateLfgDialog
            boardGameOptions={boardGameOptions}
            viewerAddress={meeple.address}
          />
        }
      />
      <LfgFilterPanel
        basePath="/lfg"
        rawSearchParams={rawSearchParams}
        filters={filters}
        gameOptions={boardGameOptions}
      />
      <LfgList posts={summaries} />
    </div>
  );
}

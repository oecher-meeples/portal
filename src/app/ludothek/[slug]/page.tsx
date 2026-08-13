import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { toPublicGame } from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { getExplainersForGame } from "@/lib/explainer/queries";
import { getOpenLfgPostsForBoardGame } from "@/lib/content/lfg";
import {
  GameDetailView,
  type HoldingHistoryEntry,
} from "@/components/feature/ludothek/game-detail-view";
import { formatDateTime } from "@/lib/utils/format";

const ORIGIN_LABELS: Record<string, string> = {
  INITIAL: "Ersterfassung",
  LOAN: "Ausleihe",
  RETURN: "Rückgabe",
  HANDOVER: "Weitergabe",
  RELOCATION: "Umlagern",
};

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tier = await getSessionTier();
  const internal = tier !== "gast";

  const games = await buildLudothekGames();
  const game = games.find((g) => g.slug === slug);
  if (!game) notFound();

  if (!internal) {
    return <GameDetailView game={toPublicGame(game)} />;
  }

  const holdings = await prisma.gameHolding.findMany({
    where: { gameCopyId: game.id },
    orderBy: { startedAt: "desc" },
    include: {
      unit: { select: { label: true, code: true } },
      meeple: { select: { displayName: true } },
      recordedBy: { select: { displayName: true } },
    },
  });

  const history: HoldingHistoryEntry[] = holdings.map((holding) => ({
    id: holding.id,
    origin: ORIGIN_LABELS[holding.origin] ?? holding.origin,
    target: holding.meeple
      ? holding.meeple.displayName
      : (holding.unit?.label ?? holding.unit?.code ?? "—"),
    startedAt: formatDateTime(holding.startedAt),
    endedAt: holding.endedAt ? formatDateTime(holding.endedAt) : null,
    confirmedAt: holding.confirmedAt?.toISOString() ?? null,
    recordedByName: holding.recordedBy.displayName,
  }));

  const responsibleName = game.responsibleMeepleId
    ? ((
        await prisma.meeple.findUnique({
          where: { id: game.responsibleMeepleId },
          select: { displayName: true },
        })
      )?.displayName ?? null)
    : null;

  const [explainerEntries, meeple, user, openLfgPosts] = await Promise.all([
    getExplainersForGame(game.boardGameId),
    getCurrentMeeple(),
    getCurrentUser(),
    getOpenLfgPostsForBoardGame(game.boardGameId),
  ]);
  const myLevel =
    explainerEntries.find((entry) => entry.meepleId === meeple?.id)?.level ??
    null;

  const canManageGames =
    !!user && (await hasPermission(user.id, "games:manage"));
  const linkedIds = new Set([
    ...game.baseGames.map((g) => g.id),
    ...game.expansions.map((g) => g.id),
    game.boardGameId,
  ]);
  const expansionAssignment = canManageGames
    ? {
        options: (
          await prisma.boardGame.findMany({
            where: { id: { notIn: [...linkedIds] } },
            select: { id: true, title: true },
            orderBy: { title: "asc" },
          })
        ).map((g) => g),
      }
    : undefined;

  return (
    <GameDetailView
      game={toPublicGame(game)}
      internal={{
        zustand: game.zustand,
        locationChain: game.locationChain,
        responsibleName,
        history,
      }}
      explainer={{ entries: explainerEntries, myLevel }}
      expansionAssignment={expansionAssignment}
      openLfgPosts={openLfgPosts}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { toPublicGame } from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { findExpansionAssignmentOptions } from "@/lib/ludothek/board-games";
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
  // One title can have several physical copies (same boardGameSlug) — the
  // header/description render from the first copy, `copies` below carries
  // every one of them for the exemplar table/card (#121/#122).
  const game = games.find((g) => g.boardGameSlug === slug);
  if (!game) notFound();
  const copies = games.filter((g) => g.boardGameId === game.boardGameId);

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

  const responsibleIds = [
    ...new Set(
      copies
        .map((c) => c.responsibleMeepleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const responsibleMeeples = responsibleIds.length
    ? await prisma.meeple.findMany({
        where: { id: { in: responsibleIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const responsibleNameById = new Map(
    responsibleMeeples.map((m) => [m.id, m.displayName]),
  );
  const responsibleName = game.responsibleMeepleId
    ? (responsibleNameById.get(game.responsibleMeepleId) ?? null)
    : null;
  const copyRows = copies.map((copy) => ({
    id: copy.id,
    zustand: copy.zustand,
    locationChain: copy.locationChain,
    responsibleName: copy.responsibleMeepleId
      ? (responsibleNameById.get(copy.responsibleMeepleId) ?? null)
      : null,
    condition: copy.condition,
  }));

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
        options: await findExpansionAssignmentOptions(game.kind, [
          ...linkedIds,
        ]),
      }
    : undefined;
  const titleEdit = canManageGames
    ? {
        boardGameId: game.boardGameId,
        title: game.title,
        ean: game.ean,
        kind: game.kind,
        bggId: game.bggId,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTimeMinutes: game.playTimeMinutes,
        weight: game.weight,
        imageUrl: game.imageUrl,
        description: game.description,
        mechanics: game.mechanics,
        explainerVideoUrl: game.explainerVideoUrl,
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
      titleEdit={titleEdit}
      copies={copyRows}
      canManageGames={canManageGames}
      openLfgPosts={openLfgPosts}
    />
  );
}

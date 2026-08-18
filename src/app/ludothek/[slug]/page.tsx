import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/utils/prisma";
import { Button } from "@/components/ui/button";
import { CreateLfgDialog } from "@/components/feature/lfg/create-lfg-dialog";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { listDistinctMechanics, toPublicGame } from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { findExpansionAssignmentOptions } from "@/lib/ludothek/board-games";
import { getContactLinks } from "@/lib/members/contact";
import { getExplainersForGame } from "@/lib/explainer/queries";
import { getOpenLfgPostsForBoardGame } from "@/lib/content/lfg";
import { findCurrentEvent } from "@/lib/events/upcoming";
import { getGuestCopyAvailability } from "@/lib/events/guest-area";
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
    const currentEvent = await findCurrentEvent();
    const availability = await getGuestCopyAvailability(
      copies.map((c) => ({ id: c.id, zustand: c.zustand })),
      currentEvent?.id ?? null,
    );
    return (
      <GameDetailView
        game={toPublicGame(game)}
        bggId={game.bggId}
        availability={availability}
      />
    );
  }

  // Merged Exemplare-Bereich (Plan-Schritt 6): history is fetched for every
  // copy of the title, not just `game.id`, then grouped per copy below.
  const holdings = await prisma.gameHolding.findMany({
    where: { gameCopyId: { in: copies.map((c) => c.id) } },
    orderBy: { startedAt: "desc" },
    include: {
      unit: { select: { label: true, code: true } },
      meeple: { select: { displayName: true } },
      recordedBy: { select: { displayName: true } },
    },
  });

  const historyByCopyId = new Map<string, HoldingHistoryEntry[]>();
  for (const holding of holdings) {
    const entry: HoldingHistoryEntry = {
      id: holding.id,
      origin: ORIGIN_LABELS[holding.origin] ?? holding.origin,
      target: holding.meeple
        ? holding.meeple.displayName
        : (holding.unit?.label ?? holding.unit?.code ?? "—"),
      startedAt: formatDateTime(holding.startedAt),
      endedAt: holding.endedAt ? formatDateTime(holding.endedAt) : null,
      confirmedAt: holding.confirmedAt?.toISOString() ?? null,
      recordedByName: holding.recordedBy.displayName,
    };
    const existing = historyByCopyId.get(holding.gameCopyId) ?? [];
    existing.push(entry);
    historyByCopyId.set(holding.gameCopyId, existing);
  }

  // Names come straight from `buildLudothekGames()` — only the contact links
  // (mail/telegram) for the responsible person's `ContactDialog` need their
  // own lookup here.
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
        select: { id: true, email: true, telegramHandle: true },
      })
    : [];
  const contactById = new Map(
    responsibleMeeples.map((m) => [m.id, getContactLinks(m)]),
  );
  const NO_CONTACT = { mailHref: null, telegramHref: null };
  const currentMeeple = await getCurrentMeeple();
  const copyRows = copies.map((copy) => ({
    id: copy.id,
    zustand: copy.zustand,
    unitChain: copy.unitChain,
    responsibleName: copy.responsibleName,
    responsibleContact: copy.responsibleMeepleId
      ? (contactById.get(copy.responsibleMeepleId) ?? NO_CONTACT)
      : NO_CONTACT,
    condition: copy.condition,
    isMine:
      currentMeeple !== null && copy.responsibleMeepleId === currentMeeple.id,
    history: historyByCopyId.get(copy.id) ?? [],
  }));

  // Representative location for each linked base game/expansion (#121) —
  // best-effort: a linked title with several copies shows its first one.
  const linkedRefIds = [
    ...game.baseGames.map((g) => g.id),
    ...game.expansions.map((g) => g.id),
  ];
  const relatedLocationChains = Object.fromEntries(
    linkedRefIds.map((id) => [
      id,
      games.find((g) => g.boardGameId === id)?.locationChain ?? "",
    ]),
  );

  const [explainerEntries, user, openLfgPosts] = await Promise.all([
    getExplainersForGame(game.boardGameId),
    getCurrentUser(),
    getOpenLfgPostsForBoardGame(game.boardGameId),
  ]);
  const myLevel =
    explainerEntries.find((entry) => entry.meepleId === currentMeeple?.id)
      ?.level ?? null;

  const canManageGames =
    !!user && (await hasPermissionInCurrentView(user.id, "games:manage"));
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
  const mechanicsOptions = canManageGames
    ? listDistinctMechanics(games)
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

  const createLfgTrigger = (
    <CreateLfgDialog
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Spielergesuch eröffnen
        </Button>
      }
      defaultGameTitle={game.title}
      defaultBoardGameId={game.boardGameId}
      defaultMaxParticipants={game.maxPlayers ?? undefined}
    />
  );

  return (
    <GameDetailView
      game={toPublicGame(game)}
      bggId={game.bggId}
      explainer={{ entries: explainerEntries, myLevel }}
      expansionAssignment={expansionAssignment}
      titleEdit={titleEdit}
      mechanicsOptions={mechanicsOptions}
      relatedLocationChains={relatedLocationChains}
      copies={copyRows}
      canManageGames={canManageGames}
      openLfgPosts={openLfgPosts}
      createLfgTrigger={createLfgTrigger}
    />
  );
}

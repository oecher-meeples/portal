import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { prisma } from "@/lib/utils/prisma";
import { Button } from "@/components/ui/button";
import { CreateLfgDialog } from "@/components/feature/lfg/create-lfg-dialog";
import { CreateMarketListingDialog } from "@/components/feature/markt/create-market-listing-dialog";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { listDistinctMechanics, toPublicGame } from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { buildPrivateLudothekGames } from "@/lib/ludothek/private-collection";
import { findExpansionAssignmentOptions } from "@/lib/ludothek/board-games";
import { getContactLinks, type ContactLinks } from "@/lib/members/contact";
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
  const user = await getCurrentUser();
  // "internal" braucht mehr als nur eingeloggt zu sein — eine "Ausgetreten"-
  // Rolle (#332) verliert das Recht, während sie noch eingeloggt bleibt.
  const internal =
    tier !== "gast" &&
    (user ? await hasPermission(user.id, "ludothek:view") : false);

  const clubGames = await buildLudothekGames();
  // One title can have several physical copies (same boardGameSlug) — the
  // header/description render from the first copy, `copies` below carries
  // every one of them for the exemplar table/card (#121/#122).
  let games = clubGames;
  let game = clubGames.find((g) => g.boardGameSlug === slug);

  // Privatbesitz-Titel bekommen dieselbe Detailseite wie Vereinsspiele
  // (#255-Folge) — nur intern erreichbar, unabhängig vom "Auch Privatbesitz
  // anzeigen"-Filter der Übersichtsseite (das ist ein reiner Browse-Filter,
  // ein direkter Link muss trotzdem funktionieren). Für Gäste nie geladen,
  // und nur bei einem Vereins-Fehltreffer nachgeladen — kein Extra-Query auf
  // jeder normalen Detailseite.
  if (!game && internal) {
    const privateGames = await buildPrivateLudothekGames();
    games = [...clubGames, ...privateGames];
    game = games.find((g) => g.boardGameSlug === slug);
  }

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
        select: {
          id: true,
          email: true,
          telegramHandle: true,
          signalHandle: true,
          discordHandle: true,
          address: true,
          shareAddress: true,
        },
      })
    : [];
  const contactById = new Map(
    responsibleMeeples.map((m) => [m.id, getContactLinks(m)]),
  );
  const NO_CONTACT: ContactLinks = {
    mailHref: null,
    telegramHref: null,
    signalHref: null,
    discordHandle: null,
    address: null,
  };
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
    ruleBookLanguages: copy.ruleBookLanguages,
    inventoryNumber: copy.inventoryNumber,
    isMine:
      currentMeeple !== null && copy.responsibleMeepleId === currentMeeple.id,
    history: historyByCopyId.get(copy.id) ?? [],
    isPrivate: copy.isPrivate,
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

  const [explainerEntries, openLfgPosts] = await Promise.all([
    getExplainersForGame(game.boardGameId),
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
        secondaryTitle: game.secondaryTitle,
        ean: game.ean,
        kind: game.kind,
        bggId: game.bggId,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTimeMinutes: game.playTimeMinutes,
        weight: game.weight,
        averageRating: game.averageRating,
        imageUrl: game.imageUrl,
        description: game.description,
        mechanics: game.mechanics,
        explainerVideoUrl: game.explainerVideoUrl,
        languageDependence: game.languageDependence,
        publisher: game.publisher,
        author: game.author,
        yearPublished: game.yearPublished,
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

  // Existiert bereits (mind.) eine Marktplatz-Anzeige für diesen Titel,
  // verlinkt der Button auf die vorgefilterte Übersicht statt auf eine
  // einzelne Anzeige (#278-Folge) — bei mehreren Exemplaren/Anzeigen sollen
  // alle sichtbar sein, nicht nur die zuletzt angelegte.
  const hasActiveMarketListing = await prisma.marketListing.findFirst({
    where: { boardGameId: game.boardGameId },
    select: { id: true },
  });
  const marketListingSection = hasActiveMarketListing ? (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      render={<Link href={`/markt?suche=${encodeURIComponent(game.title)}`} />}
    >
      <Tag className="size-4" />
      Wird gerade verkauft
    </Button>
  ) : (
    <CreateMarketListingDialog
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Tag className="size-4" />
          Verkaufen
        </Button>
      }
      initialTitle={game.title}
      boardGameId={game.boardGameId}
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
      marketListingSection={marketListingSection}
    />
  );
}

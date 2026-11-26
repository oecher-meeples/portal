"use client";

import { memo, useMemo, type CSSProperties, type ReactNode } from "react";
import type { BoardGameTrait } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/components/ui/use-infinite-scroll";
import { GameCard } from "@/components/entities/game-card";
import { GameListRow } from "@/components/entities/game-list-row";
import { GameCompactRow } from "@/components/entities/game-compact-row";
import { GameCardEditOverlay } from "@/components/widgets/board-game/game-card-edit-overlay";
import { EditBoardGameTitleDialog } from "@/components/widgets/board-game/edit-board-game-title-dialog";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { groupGamesByTitle } from "@/lib/ludothek/title-grouping";
import type { BoardGameTraitTextData } from "@/lib/ludothek/board-game-traits";
import type {
  LudothekGame,
  LudothekViewMode,
  PublicLudothekGame,
} from "@/lib/ludothek/browser";

const EMPTY_MESSAGE = "Keine Spiele gefunden.";

/** Platzhalter beim Nachladen (#461) in der Form der jeweiligen Ansicht. */
const SKELETON_COUNT = 4;
const SKELETON_CLASS = {
  grid: "aspect-[3/4] w-full rounded-lg",
  liste: "h-44 w-full rounded-lg",
  compact: "h-12 w-full",
} as const;

/** Every copy folded into this title, in the shape `GameActionsMenu`'s
 * Exemplar-Auswahl-Popup needs (Plan-Schritt 12) — only meaningful once
 * `"condition" in game` narrowed the caller to the internal shape. */
function actionsMenuCopies(game: LudothekGame & { copies: LudothekGame[] }) {
  return game.copies.map((copy) => ({
    id: copy.id,
    zustand: copy.zustand,
    locationChain: copy.locationChain,
    condition: copy.condition,
    ruleBookLanguages: copy.ruleBookLanguages,
    inventoryNumber: copy.inventoryNumber,
    versionId: copy.versionId,
  }));
}

/** Admin controls shared by the list and compact rows (#121/#122):
 * "Bearbeiten" now always opens the title dialog (Plan-Schritt 10) — with
 * `copyCount > 1` there's no single exemplar left to edit here, the
 * Mängelvermerk moved into the actions menu instead. */
function rowActions(
  game: PublicLudothekGame | LudothekGame,
  mechanicsOptions: string[],
) {
  if (!("condition" in game)) return undefined;
  return (
    <>
      <EditBoardGameTitleDialog
        game={game}
        mechanicsOptions={mechanicsOptions}
      />
      {/* Privatbesitz-Zeilen haben kein GameCopy dahinter — die Exemplar-
       * Übersicht bleibt für sie nicht bearbeitbar (#255-Folge). */}
      {!game.isPrivate && (
        <GameActionsMenu
          copies={actionsMenuCopies(
            game as LudothekGame & { copies: LudothekGame[] },
          )}
          boardGameId={game.boardGameId}
          boardGameTitle={game.title}
          canManageGames
        />
      )}
    </>
  );
}

/** Renders the games matching the current filters in grid, list or compact
 * shape (Plan-Schritt 11). Mit `onLoadMore` lädt das Ende der Liste die
 * nächste Seite Titel per Server-Request nach (#461); memoisiert, damit
 * Tastendrücke im Suchfeld nicht jedes Mal alle Karten neu rendern. */
export const LudothekResults = memo(function LudothekResults({
  games,
  view,
  canManageGames,
  mechanicsOptions,
  cardMinWidth,
  traitTexts,
  onLoadMore,
  cursor,
  hasMore,
  isLoadingMore = false,
}: {
  /** Bereits geladene Exemplar-Zeilen, alle Exemplare eines Titels in
   * derselben Seite (`paginateByTitle`). */
  games: (PublicLudothekGame | LudothekGame)[];
  /** Server-Nachladen (#461): bekommt den Titel-Offset der nächsten Seite. */
  onLoadMore?: (offset: number) => void;
  cursor?: number | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  view: LudothekViewMode;
  canManageGames: boolean;
  /** Autocomplete-Vorschläge for the title-edit dialog's Mechaniken field
   * (#124) — only meaningful together with `canManageGames`. */
  mechanicsOptions?: string[];
  /** #446: `minmax(...)`-Minimalwert der Grid-Karten in px — nur für
   * `view === "grid"` relevant, wird dort per Slider eingestellt. */
  cardMinWidth?: number;
  /** Admin-editierbare Anzeige-Texte je Trait (#487-Konzept) — einmal pro
   * Seite geladen, hier nur durchgereicht an Card/List-Row. */
  traitTexts?: Partial<Record<BoardGameTrait, BoardGameTraitTextData>>;
}) {
  // One card/row per title in all three views (Plan-Schritt 8) — a title
  // with several copies shows a single entry with the aggregated zustand.
  const rows = useMemo(() => groupGamesByTitle(games), [games]);
  const { sentinelRef, isEndReached } = useInfiniteScroll(games, {
    initialCount: games.length,
    step: 0,
    onLoadMore,
    cursor: cursor ?? undefined,
    hasMore,
  });

  const shape: keyof typeof SKELETON_CLASS =
    view === "compact" && canManageGames
      ? "compact"
      : view === "liste"
        ? "liste"
        : "grid";
  const skeletons =
    isLoadingMore &&
    Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <Skeleton key={`skeleton-${index}`} className={SKELETON_CLASS[shape]} />
    ));
  const isEmpty = rows.length === 0 && !isLoadingMore;

  return (
    <div className="flex flex-col gap-4">
      {renderRows()}
      {onLoadMore && rows.length > 0 && isEndReached && !isLoadingMore && (
        <p className="text-muted-foreground py-2 text-center text-sm">
          Alle Spiele geladen.
        </p>
      )}
      <div ref={sentinelRef} />
    </div>
  );

  function renderRows(): ReactNode {
    if (shape === "compact") {
      return (
        <div className="flex flex-col gap-1.5">
          {rows.map((game) => (
            <GameCompactRow
              key={game.boardGameSlug}
              game={game as LudothekGame}
              actions={rowActions(game, mechanicsOptions ?? [])}
            />
          ))}
          {skeletons}
          {isEmpty && (
            <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
          )}
        </div>
      );
    }

    if (shape === "liste") {
      return (
        <div className="flex flex-col gap-3">
          {rows.map((game) => (
            <GameListRow
              key={game.boardGameSlug}
              game={game}
              actions={
                canManageGames
                  ? rowActions(game, mechanicsOptions ?? [])
                  : undefined
              }
              traitTexts={traitTexts}
            />
          ))}
          {skeletons}
          {isEmpty && (
            <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
          )}
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(var(--ludothek-card-min-width,220px),1fr))] gap-4"
        style={
          cardMinWidth
            ? ({
                "--ludothek-card-min-width": `${cardMinWidth}px`,
              } as CSSProperties)
            : undefined
        }
      >
        {rows.map((game) => (
          <GameCard
            key={game.boardGameSlug}
            game={game}
            traitTexts={traitTexts}
            actions={
              canManageGames && "eans" in game ? (
                <div className="flex items-center gap-1">
                  <GameCardEditOverlay
                    game={game}
                    mechanicsOptions={mechanicsOptions}
                  />
                  {"condition" in game && !game.isPrivate && (
                    <StopRowNavigation className="bg-background/90 rounded-md backdrop-blur-sm">
                      <GameActionsMenu
                        copies={actionsMenuCopies(
                          game as LudothekGame & { copies: LudothekGame[] },
                        )}
                        boardGameId={game.boardGameId}
                        boardGameTitle={game.title}
                        canManageGames
                      />
                    </StopRowNavigation>
                  )}
                </div>
              ) : undefined
            }
          />
        ))}
        {skeletons}
        {isEmpty && (
          <p className="text-muted-foreground col-span-full text-sm">
            {EMPTY_MESSAGE}
          </p>
        )}
      </div>
    );
  }
});

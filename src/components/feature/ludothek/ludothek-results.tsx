import { GameCard } from "@/components/entities/game-card";
import { GameListRow } from "@/components/entities/game-list-row";
import { GameCompactRow } from "@/components/entities/game-compact-row";
import { GameCardEditOverlay } from "@/components/widgets/board-game/game-card-edit-overlay";
import { EditBoardGameTitleDialog } from "@/components/widgets/board-game/edit-board-game-title-dialog";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { groupGamesByTitle } from "@/lib/ludothek/title-grouping";
import type {
  LudothekGame,
  LudothekViewMode,
  PublicLudothekGame,
} from "@/lib/ludothek/browser";

const EMPTY_MESSAGE = "Keine Spiele gefunden.";

/** Every copy folded into this title, in the shape `GameActionsMenu`'s
 * Exemplar-Auswahl-Popup needs (Plan-Schritt 12) — only meaningful once
 * `"condition" in game` narrowed the caller to the internal shape. */
function actionsMenuCopies(game: LudothekGame & { copies: LudothekGame[] }) {
  return game.copies.map((copy) => ({
    id: copy.id,
    zustand: copy.zustand,
    locationChain: copy.locationChain,
    condition: copy.condition,
  }));
}

/** Admin controls shared by the list and compact rows (#121/#122):
 * "Bearbeiten" now always opens the title dialog (Plan-Schritt 10) — with
 * `copyCount > 1` there's no single exemplar left to edit here, the
 * Mängelvermerk moved into the actions menu instead. */
function rowActions(game: PublicLudothekGame | LudothekGame) {
  if (!("condition" in game)) return undefined;
  return (
    <>
      <EditBoardGameTitleDialog game={game} />
      <GameActionsMenu
        copies={actionsMenuCopies(
          game as LudothekGame & { copies: LudothekGame[] },
        )}
        boardGameId={game.boardGameId}
        boardGameTitle={game.title}
        canManageGames
      />
    </>
  );
}

/** Renders the games matching the current filters in grid, list or compact
 * shape (Plan-Schritt 11) — the "Privatbesitz"-section stays a fixed grid and
 * is rendered separately by the caller regardless of the chosen mode. */
export function LudothekResults({
  games,
  view,
  canManageGames,
}: {
  games: (PublicLudothekGame | LudothekGame)[];
  view: LudothekViewMode;
  canManageGames: boolean;
}) {
  // One card/row per title in all three views (Plan-Schritt 8) — a title
  // with several copies shows a single entry with the aggregated zustand.
  const rows = groupGamesByTitle(games);

  if (view === "compact" && canManageGames) {
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map((game) => (
          <GameCompactRow
            key={game.boardGameSlug}
            game={game as LudothekGame}
            actions={rowActions(game)}
          />
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
        )}
      </div>
    );
  }

  if (view === "liste") {
    return (
      <div className="flex flex-col gap-3">
        {rows.map((game) => (
          <GameListRow
            key={game.boardGameSlug}
            game={game}
            actions={canManageGames ? rowActions(game) : undefined}
          />
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((game) => (
        <GameCard
          key={game.boardGameSlug}
          game={game}
          actions={
            canManageGames && "ean" in game ? (
              <div className="flex items-center gap-1">
                <GameCardEditOverlay game={game} />
                {"condition" in game && (
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
      {rows.length === 0 && (
        <p className="text-muted-foreground col-span-full text-sm">
          {EMPTY_MESSAGE}
        </p>
      )}
    </div>
  );
}

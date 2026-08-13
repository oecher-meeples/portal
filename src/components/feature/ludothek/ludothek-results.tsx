import { GameCard } from "@/components/entities/game-card";
import { GameListRow } from "@/components/entities/game-list-row";
import { GameCompactRow } from "@/components/entities/game-compact-row";
import { GameCardEditOverlay } from "@/components/widgets/board-game/game-card-edit-overlay";
import { EditBoardGameExemplarDialog } from "@/components/widgets/board-game/edit-board-game-exemplar-dialog";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import type {
  LudothekGame,
  LudothekViewMode,
  PublicLudothekGame,
} from "@/lib/ludothek/browser";

const EMPTY_MESSAGE = "Keine Spiele gefunden.";

/** Admin controls for one copy — shared by the list and compact rows (#121/#122). */
function rowActions(game: PublicLudothekGame | LudothekGame) {
  if (!("condition" in game)) return undefined;
  return (
    <>
      <EditBoardGameExemplarDialog copyId={game.id} condition={game.condition} />
      <GameActionsMenu
        gameCopyId={game.id}
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
  if (view === "compact" && canManageGames) {
    return (
      <div className="flex flex-col gap-1.5">
        {games.map((game) => (
          <GameCompactRow
            key={game.slug}
            game={game as LudothekGame}
            actions={rowActions(game)}
          />
        ))}
        {games.length === 0 && (
          <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
        )}
      </div>
    );
  }

  if (view === "liste") {
    return (
      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <GameListRow
            key={game.slug}
            game={game}
            actions={canManageGames ? rowActions(game) : undefined}
          />
        ))}
        {games.length === 0 && (
          <p className="text-muted-foreground text-sm">{EMPTY_MESSAGE}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {games.map((game) => (
        <GameCard
          key={game.slug}
          game={game}
          actions={
            canManageGames && "ean" in game ? (
              <GameCardEditOverlay game={game} />
            ) : undefined
          }
        />
      ))}
      {games.length === 0 && (
        <p className="text-muted-foreground col-span-full text-sm">
          {EMPTY_MESSAGE}
        </p>
      )}
    </div>
  );
}

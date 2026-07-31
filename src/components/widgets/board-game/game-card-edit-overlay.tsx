"use client";

import {
  EditBoardGameDialog,
  type EditableBoardGame,
} from "@/components/widgets/board-game/edit-board-game-dialog";

/**
 * GameCard wraps the whole card in a Link — this stops the click from
 * bubbling into it so opening the edit dialog doesn't also navigate away.
 */
export function GameCardEditOverlay({ game }: { game: EditableBoardGame }) {
  return (
    <div
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="bg-background/90 rounded-md backdrop-blur-sm"
    >
      <EditBoardGameDialog game={game} />
    </div>
  );
}

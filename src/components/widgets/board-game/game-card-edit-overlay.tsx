import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import {
  EditBoardGameDialog,
  type EditableBoardGame,
} from "@/components/widgets/board-game/edit-board-game-dialog";

export function GameCardEditOverlay({ game }: { game: EditableBoardGame }) {
  return (
    <StopRowNavigation className="bg-background/90 rounded-md backdrop-blur-sm">
      <EditBoardGameDialog game={game} />
    </StopRowNavigation>
  );
}

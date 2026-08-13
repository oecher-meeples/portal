import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import {
  EditBoardGameTitleDialog,
  type EditableBoardGameTitle,
} from "@/components/widgets/board-game/edit-board-game-title-dialog";

/** "Bearbeiten" opens the title dialog, not a per-copy one — with several
 * exemplare per card (Plan-Schritt 8) there's no single "the" copy to edit
 * here anymore (Plan-Schritt 10). */
export function GameCardEditOverlay({
  game,
}: {
  game: EditableBoardGameTitle;
}) {
  return (
    <StopRowNavigation className="bg-background/90 rounded-md backdrop-blur-sm">
      <EditBoardGameTitleDialog game={game} />
    </StopRowNavigation>
  );
}

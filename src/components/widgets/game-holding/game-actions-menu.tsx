"use client";

import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { requestCompletenessCheck } from "@/lib/ludothek/game-copies";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";
import { DeinventoriseBoardGameDialog } from "@/components/widgets/board-game/deinventorise-board-game-dialog";
import {
  AcceptReturnDialog,
  BorrowGameDialog,
  GiveToMeepleDialog,
  RelocateGameDialog,
} from "@/components/widgets/game-holding/holding-mini-dialogs";

/**
 * Rights-based aufenthalt/admin actions for one physical copy, replacing the
 * scattered per-row buttons in list/compact views (#121/#122). "Geprüft"
 * stays a placeholder — it needs its own Mängelvermerk input, out of scope
 * here (see `PruefbogenPanel`) — everything else is wired to the existing
 * scan-or-select mini-dialogs / server actions.
 */
export function GameActionsMenu({
  gameCopyId,
  boardGameId,
  boardGameTitle,
  canManageGames,
}: {
  gameCopyId: string;
  boardGameId: string;
  boardGameTitle: string;
  canManageGames: boolean;
}) {
  const { run, pending } = useAction();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <MoreVertical className="size-4" />
            <span className="sr-only">Aktionen</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Aufenthalt</DropdownMenuLabel>
          <DropdownMenuItem disabled>Geprüft</DropdownMenuItem>
          <div className="px-1.5 py-1">
            <BorrowGameDialog gameCopyId={gameCopyId} />
          </div>
          <div className="px-1.5 py-1">
            <GiveToMeepleDialog gameCopyId={gameCopyId} />
          </div>
          <div className="px-1.5 py-1">
            <AcceptReturnDialog gameCopyId={gameCopyId} />
          </div>
          <div className="px-1.5 py-1">
            <RelocateGameDialog gameCopyId={gameCopyId} />
          </div>
        </DropdownMenuGroup>

        {canManageGames && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Verwaltung</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={pending}
                onClick={() => run(() => requestCompletenessCheck(gameCopyId))}
              >
                Prüfung anfordern
              </DropdownMenuItem>
              <div className="px-1.5 py-1">
                <AddGameCopyDialog
                  boardGameId={boardGameId}
                  boardGameTitle={boardGameTitle}
                />
              </div>
              <div className="px-1.5 py-1">
                <DeinventoriseBoardGameDialog
                  gameId={gameCopyId}
                  gameTitle={boardGameTitle}
                />
              </div>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

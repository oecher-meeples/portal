"use client";

import { useState } from "react";
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
import { EditBoardGameExemplarDialog } from "@/components/widgets/board-game/edit-board-game-exemplar-dialog";
import {
  AcceptReturnDialog,
  BorrowGameDialog,
  GiveToMeepleDialog,
  RelocateGameDialog,
} from "@/components/widgets/game-holding/holding-mini-dialogs";
import { CopyPickerDialog } from "@/components/widgets/game-holding/copy-picker-dialog";
import type { GameZustand } from "@/lib/ludothek/holdings";

export type GameActionsCopy = {
  id: string;
  zustand: GameZustand;
  locationChain: string;
  condition: string | null;
};

type ActionKey =
  | "borrow"
  | "give"
  | "return"
  | "relocate"
  | "condition"
  | "deinventorise"
  | "completeness-check";

const ACTION_LABELS: Record<ActionKey, string> = {
  borrow: "Ausleihen",
  give: "Weitergeben",
  return: "Rückgabe",
  relocate: "Umlagern",
  condition: "Mängelvermerk bearbeiten",
  deinventorise: "Deinventarisieren",
  "completeness-check": "Prüfung anfordern",
};

const AUFENTHALT_ACTIONS: ActionKey[] = [
  "borrow",
  "give",
  "return",
  "relocate",
];
const VERWALTUNG_ACTIONS: ActionKey[] = [
  "completeness-check",
  "condition",
  "deinventorise",
];

/**
 * Rights-based aufenthalt/admin actions for one title's exemplare, replacing
 * the scattered per-row buttons in list/compact/grid views (#121/#122).
 * "Geprüft" stays a placeholder — it needs its own Mängelvermerk input, out
 * of scope here (see `PruefbogenPanel`).
 *
 * With `copies.length > 1` (Plan-Schritt 12) every exemplar-bound entry is
 * ambiguous — clicking it opens the `CopyPickerDialog` first, and only once
 * an exemplar is chosen does the actual mini-dialog open, now scoped to that
 * one copy. "Weiteres Exemplar hinzufügen" needs no existing copy and always
 * skips the picker.
 */
export function GameActionsMenu({
  copies,
  boardGameId,
  boardGameTitle,
  canManageGames,
}: {
  copies: GameActionsCopy[];
  boardGameId: string;
  boardGameTitle: string;
  canManageGames: boolean;
}) {
  const { run, pending } = useAction();
  const [pendingPick, setPendingPick] = useState<ActionKey | null>(null);
  const [chosen, setChosen] = useState<{
    action: ActionKey;
    copyId: string;
  } | null>(null);
  const ambiguous = copies.length > 1;
  const sole = copies[0];

  async function pickCopy(copyId: string) {
    const action = pendingPick;
    setPendingPick(null);
    if (!action) return;
    if (action === "completeness-check") {
      await run(() => requestCompletenessCheck(copyId));
      return;
    }
    setChosen({ action, copyId });
  }

  function closeChosen(open: boolean) {
    if (!open) setChosen(null);
  }

  const chosenCondition = chosen
    ? (copies.find((c) => c.id === chosen.copyId)?.condition ?? null)
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-sm">
              <MoreVertical className="size-4" />
              <span className="sr-only">Aktionen</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Aufenthalt</DropdownMenuLabel>
            <DropdownMenuItem disabled>Geprüft</DropdownMenuItem>
            {ambiguous ? (
              AUFENTHALT_ACTIONS.map((key) => (
                <DropdownMenuItem key={key} onClick={() => setPendingPick(key)}>
                  {ACTION_LABELS[key]}
                </DropdownMenuItem>
              ))
            ) : (
              <>
                <div className="px-1.5 py-1">
                  <BorrowGameDialog gameCopyId={sole.id} />
                </div>
                <div className="px-1.5 py-1">
                  <GiveToMeepleDialog gameCopyId={sole.id} />
                </div>
                <div className="px-1.5 py-1">
                  <AcceptReturnDialog gameCopyId={sole.id} />
                </div>
                <div className="px-1.5 py-1">
                  <RelocateGameDialog gameCopyId={sole.id} />
                </div>
              </>
            )}
          </DropdownMenuGroup>

          {canManageGames && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Verwaltung</DropdownMenuLabel>
                {ambiguous ? (
                  VERWALTUNG_ACTIONS.map((key) => (
                    <DropdownMenuItem
                      key={key}
                      disabled={key === "completeness-check" && pending}
                      onClick={() => setPendingPick(key)}
                    >
                      {ACTION_LABELS[key]}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <>
                    <DropdownMenuItem
                      disabled={pending}
                      onClick={() =>
                        run(() => requestCompletenessCheck(sole.id))
                      }
                    >
                      {ACTION_LABELS["completeness-check"]}
                    </DropdownMenuItem>
                    <div className="px-1.5 py-1">
                      <EditBoardGameExemplarDialog
                        copyId={sole.id}
                        condition={sole.condition}
                        triggerLabel={ACTION_LABELS.condition}
                      />
                    </div>
                  </>
                )}
                <div className="px-1.5 py-1">
                  <AddGameCopyDialog
                    boardGameId={boardGameId}
                    boardGameTitle={boardGameTitle}
                  />
                </div>
                {!ambiguous && (
                  <div className="px-1.5 py-1">
                    <DeinventoriseBoardGameDialog
                      gameId={sole.id}
                      gameTitle={boardGameTitle}
                    />
                  </div>
                )}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {pendingPick && (
        <CopyPickerDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingPick(null);
          }}
          copies={copies}
          onPick={pickCopy}
        />
      )}

      {chosen?.action === "borrow" && (
        <BorrowGameDialog
          gameCopyId={chosen.copyId}
          open
          onOpenChange={closeChosen}
        />
      )}
      {chosen?.action === "give" && (
        <GiveToMeepleDialog
          gameCopyId={chosen.copyId}
          open
          onOpenChange={closeChosen}
        />
      )}
      {chosen?.action === "return" && (
        <AcceptReturnDialog
          gameCopyId={chosen.copyId}
          open
          onOpenChange={closeChosen}
        />
      )}
      {chosen?.action === "relocate" && (
        <RelocateGameDialog
          gameCopyId={chosen.copyId}
          open
          onOpenChange={closeChosen}
        />
      )}
      {chosen?.action === "condition" && (
        <EditBoardGameExemplarDialog
          copyId={chosen.copyId}
          condition={chosenCondition}
          triggerLabel={ACTION_LABELS.condition}
          open
          onOpenChange={closeChosen}
        />
      )}
      {chosen?.action === "deinventorise" && (
        <DeinventoriseBoardGameDialog
          gameId={chosen.copyId}
          gameTitle={boardGameTitle}
          open
          onOpenChange={closeChosen}
        />
      )}
    </>
  );
}

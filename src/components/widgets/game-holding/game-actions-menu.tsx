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
import {
  AUFENTHALT_ACTIONS,
  COPY_ACTION_LABELS,
  VERWALTUNG_ACTIONS,
  isCopyActionAvailable,
  type CopyActionKey,
} from "@/lib/ludothek/copy-actions";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";
import {
  CopyActionDialog,
  type DialogCopyAction,
  type GameActionsCopy,
} from "@/components/widgets/game-holding/copy-action-dialog";
import { CopyPickerDialog } from "@/components/widgets/game-holding/copy-picker-dialog";

export type { GameActionsCopy };

/**
 * Rights-based aufenthalt/admin actions for one title's exemplare, replacing
 * the scattered per-row buttons in list/compact/grid views (#121/#122).
 * "Geprüft" stays a placeholder — it needs its own Mängelvermerk input, out
 * of scope here (see `PruefbogenPanel`).
 *
 * Ein Eintrag erscheint nur, wenn er für mindestens ein Exemplar Sinn ergibt
 * (`isCopyActionAvailable`, #548 — dieselbe Regel wie die Quick-Actions der
 * Detailseite). With several eligible copies (Plan-Schritt 12) the entry is
 * ambiguous — clicking it opens the `CopyPickerDialog` with just those
 * copies first, and only once an exemplar is chosen does the actual
 * mini-dialog open. "Weiteres Exemplar hinzufügen" needs no existing copy
 * and always skips the picker.
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
  const { run, pending } = useAction({ refresh: true });
  const [pendingPick, setPendingPick] = useState<CopyActionKey | null>(null);
  const [chosen, setChosen] = useState<{
    action: DialogCopyAction;
    copyId: string;
  } | null>(null);
  const [addCopyOpen, setAddCopyOpen] = useState(false);

  function eligibleCopies(action: CopyActionKey) {
    return copies.filter((copy) =>
      isCopyActionAvailable(action, copy, { canManageGames }),
    );
  }

  async function runOnCopy(action: CopyActionKey, copyId: string) {
    if (action === "completeness-check") {
      await run(() => requestCompletenessCheck(copyId));
      return;
    }
    setChosen({ action, copyId });
  }

  /** Bei mehreren passenden Exemplaren erst die Exemplar-Auswahl, sonst
   * direkt der Dialog für das eine Exemplar. */
  function startAction(action: CopyActionKey) {
    const eligible = eligibleCopies(action);
    if (eligible.length > 1) {
      setPendingPick(action);
      return;
    }
    void runOnCopy(action, eligible[0].id);
  }

  async function pickCopy(copyId: string) {
    const action = pendingPick;
    setPendingPick(null);
    if (action) await runOnCopy(action, copyId);
  }

  const chosenCopy = chosen
    ? copies.find((c) => c.id === chosen.copyId)
    : undefined;

  const aufenthaltItems = AUFENTHALT_ACTIONS.filter(
    (key) => eligibleCopies(key).length > 0,
  );
  const verwaltungItems = VERWALTUNG_ACTIONS.filter(
    (key) => eligibleCopies(key).length > 0,
  );

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
          {/* Nur Einträge, keine eingebetteten Dialoge: das Menü fängt für
              seine Tippsuche Buchstaben-Tasten ab, auch aus per Portal
              gerenderten Kind-Dialogen — deren Textfelder wären sonst nicht
              beschreibbar. Die Dialoge stehen unten außerhalb des Menüs. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Aufenthalt</DropdownMenuLabel>
            <DropdownMenuItem disabled>Geprüft</DropdownMenuItem>
            {aufenthaltItems.map((key) => (
              <DropdownMenuItem key={key} onClick={() => startAction(key)}>
                {COPY_ACTION_LABELS[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          {canManageGames && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Verwaltung</DropdownMenuLabel>
                {verwaltungItems.map((key) => (
                  <DropdownMenuItem
                    key={key}
                    disabled={key === "completeness-check" && pending}
                    onClick={() => startAction(key)}
                  >
                    {COPY_ACTION_LABELS[key]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setAddCopyOpen(true)}>
                  Weiteres Exemplar
                </DropdownMenuItem>
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
          copies={eligibleCopies(pendingPick)}
          onPick={pickCopy}
        />
      )}

      {chosen && chosenCopy && (
        <CopyActionDialog
          action={chosen.action}
          copy={chosenCopy}
          boardGameId={boardGameId}
          boardGameTitle={boardGameTitle}
          onOpenChange={(open) => {
            if (!open) setChosen(null);
          }}
        />
      )}
      {addCopyOpen && (
        <AddGameCopyDialog
          boardGameId={boardGameId}
          boardGameTitle={boardGameTitle}
          open
          onOpenChange={setAddCopyOpen}
        />
      )}
    </>
  );
}

"use client";

import type { ComponentType } from "react";
import type { RuleBookLanguage } from "@prisma/client";
import { DeinventoriseBoardGameDialog } from "@/components/widgets/board-game/deinventorise-board-game-dialog";
import { EditBoardGameExemplarDialog } from "@/components/widgets/board-game/edit-board-game-exemplar-dialog";
import {
  AcceptReturnDialog,
  BorrowGameDialog,
  GiveToMeepleDialog,
  RelocateGameDialog,
} from "@/components/widgets/game-holding/holding-mini-dialogs";
import {
  COPY_ACTION_LABELS,
  type CopyActionKey,
} from "@/lib/ludothek/copy-actions";
import type { GameZustand } from "@/lib/ludothek/holdings";

export type GameActionsCopy = {
  id: string;
  zustand: GameZustand;
  locationChain: string;
  condition: string | null;
  ruleBookLanguages: RuleBookLanguage[];
  /** Inventarnummer des Exemplars (#270, ganzzahlig seit #543). */
  inventoryNumber: number | null;
  /** Edition (BGG-Version) des Exemplars - Vorbelegung im Exemplar-Editor. */
  versionId?: string | null;
  /** Whether the current session holds this copy right now — gates
   * "Weitergeben" for the non-ambiguous case (#128). Omitted callers keep
   * showing it unconditionally, matching the previous behaviour. */
  isMine?: boolean;
};

/** Aktionen mit eigenem Dialog — „Prüfung anfordern" läuft ohne Dialog. */
export type DialogCopyAction = Exclude<CopyActionKey, "completeness-check">;

/** Mini-Dialog je Aufenthalts-Aktion — alle mit derselben Signatur. */
const AUFENTHALT_DIALOGS: Partial<
  Record<
    DialogCopyAction,
    ComponentType<{
      gameCopyId: string;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }>
  >
> = {
  borrow: BorrowGameDialog,
  give: GiveToMeepleDialog,
  return: AcceptReturnDialog,
  relocate: RelocateGameDialog,
};

/**
 * Der geöffnete Dialog einer Exemplar-Aktion — geteilt von `GameActionsMenu`
 * (Exemplar-Liste) und `GameCopyQuickActions` (Detailseite mit
 * vorausgewähltem Exemplar, #548), damit beide dieselben Dialoge öffnen.
 */
export function CopyActionDialog({
  action,
  copy,
  boardGameId,
  boardGameTitle,
  onOpenChange,
}: {
  action: DialogCopyAction;
  copy: GameActionsCopy;
  boardGameId: string;
  boardGameTitle: string;
  onOpenChange: (open: boolean) => void;
}) {
  const AufenthaltDialog = AUFENTHALT_DIALOGS[action];
  if (AufenthaltDialog) {
    return (
      <AufenthaltDialog gameCopyId={copy.id} open onOpenChange={onOpenChange} />
    );
  }

  if (action === "condition") {
    return (
      <EditBoardGameExemplarDialog
        copyId={copy.id}
        condition={copy.condition}
        ruleBookLanguages={copy.ruleBookLanguages}
        inventoryNumber={copy.inventoryNumber}
        boardGameId={boardGameId}
        versionId={copy.versionId}
        triggerLabel={COPY_ACTION_LABELS.condition}
        open
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <DeinventoriseBoardGameDialog
      gameId={copy.id}
      gameTitle={boardGameTitle}
      open
      onOpenChange={onOpenChange}
    />
  );
}

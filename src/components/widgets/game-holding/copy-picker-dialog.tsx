"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import type { GameZustand } from "@/lib/ludothek/holdings";

export type CopyOption = {
  id: string;
  zustand: GameZustand;
  locationChain: string;
};

/**
 * Exemplar-Auswahl-Popup (Plan-Schritt 12): shown before an exemplar-bound
 * action in `GameActionsMenu` once a title has more than one copy — picking
 * a row hands the chosen `gameCopyId` to the actual mini-dialog, which opens
 * right after (see `GameActionsMenu`'s `pending`/`chosen` state machine).
 */
export function CopyPickerDialog({
  open,
  onOpenChange,
  copies,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copies: CopyOption[];
  onPick: (copyId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exemplar wählen</DialogTitle>
          <DialogDescription>
            Dieser Titel hat mehrere Exemplare — wähle, welches gemeint ist.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5">
          {copies.map((copy) => (
            <li key={copy.id}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => onPick(copy.id)}
              >
                <span className="text-muted-foreground truncate text-sm">
                  {copy.locationChain || "—"}
                </span>
                <GameZustandPill zustand={copy.zustand} />
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

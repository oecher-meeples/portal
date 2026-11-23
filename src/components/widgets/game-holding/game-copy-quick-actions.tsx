"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  ClipboardCheck,
  HandCoins,
  Package,
  Pencil,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { requestCompletenessCheck } from "@/lib/ludothek/game-copies";
import {
  COPY_ACTION_LABELS,
  availableCopyActions,
  type CopyActionKey,
} from "@/lib/ludothek/copy-actions";
import { formatShortIdSlug } from "@/lib/short-id/short-id";
import {
  CopyActionDialog,
  type DialogCopyAction,
  type GameActionsCopy,
} from "@/components/widgets/game-holding/copy-action-dialog";

const ACTION_ICONS: Record<CopyActionKey, LucideIcon> = {
  borrow: HandCoins,
  give: ArrowLeftRight,
  return: Undo2,
  relocate: Package,
  "completeness-check": ClipboardCheck,
  condition: Pencil,
  deinventorise: Trash2,
};

/**
 * Leiste für das per QR-Code vorausgewählte Exemplar (`/ludothek/<spiel>/
 * inv-<n>`, #548): zeigt, welches Exemplar gemeint ist, und — für interne
 * Nutzer — nur die Aktionen, die gerade Sinn ergeben
 * (`availableCopyActions`, dieselbe Regel wie `GameActionsMenu`).
 * Deinventarisieren bleibt bewusst im Menü der Exemplar-Liste — zu
 * destruktiv für einen Ein-Klick-Button direkt nach dem Scan.
 */
export function GameCopyQuickActions({
  inventoryNumber,
  copy,
  boardGameId,
  boardGameTitle,
  canManageGames,
}: {
  inventoryNumber: number;
  /** Nur für interne Nutzer gesetzt — Gäste sehen nur, welches Exemplar
   * gescannt wurde; Zustand/Standort gelangen so gar nicht erst in ihren
   * Client-Payload (vgl. `toPublicGame()`). */
  copy?: GameActionsCopy;
  boardGameId: string;
  boardGameTitle: string;
  canManageGames: boolean;
}) {
  const { run, pending } = useAction({ refresh: true });
  const [openAction, setOpenAction] = useState<DialogCopyAction | null>(null);

  const actions = copy
    ? availableCopyActions(copy, { canManageGames }).filter(
        (action) => action !== "deinventorise",
      )
    : [];

  function start(action: CopyActionKey) {
    if (!copy) return;
    if (action === "completeness-check") {
      void run(() => requestCompletenessCheck(copy.id));
      return;
    }
    setOpenAction(action);
  }

  return (
    <section
      aria-label="Ausgewähltes Exemplar"
      className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          Exemplar {formatShortIdSlug({ kind: "inv", id: inventoryNumber })}
        </span>
        {copy && <GameZustandPill zustand={copy.zustand} />}
        {copy?.locationChain && (
          <span className="text-muted-foreground text-sm">
            {copy.locationChain}
          </span>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action];
            return (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={action === "completeness-check" && pending}
                onClick={() => start(action)}
              >
                <Icon className="size-4" />
                {COPY_ACTION_LABELS[action]}
              </Button>
            );
          })}
        </div>
      )}

      {openAction && copy && (
        <CopyActionDialog
          action={openAction}
          copy={copy}
          boardGameId={boardGameId}
          boardGameTitle={boardGameTitle}
          onOpenChange={(open) => {
            if (!open) setOpenAction(null);
          }}
        />
      )}
    </section>
  );
}

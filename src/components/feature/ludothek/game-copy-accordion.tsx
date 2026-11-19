"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { GameCopyExpandedDetails } from "@/components/feature/ludothek/game-copy-expanded-details";
import type { HoldingHistoryEntry } from "@/components/feature/ludothek/game-detail-view";

function ToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={open ? "Details einklappen" : "Details ausklappen"}
    >
      <ChevronDown
        className={cn("size-4 transition-transform", open && "rotate-180")}
      />
    </Button>
  );
}

/** Hintergrund des per QR-Code vorausgewählten Exemplars (#548). */
const SELECTED_CLASS = "bg-primary/5";

/** Table row per exemplar, plus its own aufenthalt/history accordion below
 * — `children` are the static cells (Zustand, Standort, Bearbeiten). A
 * `selected` row (#548) is highlighted and starts expanded. */
export function GameCopyTableRow({
  gameCopyId,
  history,
  colSpan,
  selected = false,
  children,
}: {
  gameCopyId: string;
  history: HoldingHistoryEntry[];
  colSpan: number;
  selected?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(selected);

  return (
    <>
      <TableRow
        className={cn(selected && SELECTED_CLASS)}
        aria-current={selected || undefined}
      >
        {children}
        <TableCell className="text-right">
          <ToggleButton open={open} onClick={() => setOpen((o) => !o)} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={colSpan}>
            <GameCopyExpandedDetails
              gameCopyId={gameCopyId}
              history={history}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Single-copy card equivalent of `GameCopyTableRow` — `children` is the
 * zustand/standort content, `actions` the copy's `GameActionsMenu`. Kept as
 * a dedicated prop (rather than folded into `children`) so it can be grouped
 * with the expand chevron in one right-aligned cluster (#141). */
export function GameCopyCard({
  gameCopyId,
  history,
  actions,
  selected = false,
  children,
}: {
  gameCopyId: string;
  history: HoldingHistoryEntry[];
  actions: ReactNode;
  selected?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(selected);

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        selected && cn(SELECTED_CLASS, "-m-2 rounded-md p-2"),
      )}
      aria-current={selected || undefined}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <ToggleButton open={open} onClick={() => setOpen((o) => !o)} />
        </div>
      </div>
      {open && (
        <GameCopyExpandedDetails gameCopyId={gameCopyId} history={history} />
      )}
    </div>
  );
}

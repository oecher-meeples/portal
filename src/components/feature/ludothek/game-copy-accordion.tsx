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

/** Table row per exemplar, plus its own aufenthalt/history accordion below
 * — `children` are the static cells (Zustand, Standort, Bearbeiten). */
export function GameCopyTableRow({
  gameCopyId,
  history,
  colSpan,
  children,
}: {
  gameCopyId: string;
  history: HoldingHistoryEntry[];
  colSpan: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow>
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
  children,
}: {
  gameCopyId: string;
  history: HoldingHistoryEntry[];
  actions: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
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

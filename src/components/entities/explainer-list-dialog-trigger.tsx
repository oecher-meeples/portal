"use client";

import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExplainerBadgeList } from "@/components/entities/explainer-badge-list";
import { cn } from "@/lib/utils/cn";
import type { ExplainerEntry } from "@/lib/explainer/queries";

/**
 * Search-icon button that opens a dialog listing every Erklärbär for one
 * Spiel — used both on the Ludothek-Detailseite and the Admin-Verzeichnis
 * (#210), so the dialog markup lives here once instead of twice.
 */
export function ExplainerListDialogTrigger({
  boardGameTitle,
  explainers,
  badgeCount,
  className,
}: {
  boardGameTitle: string;
  explainers: ExplainerEntry[];
  /** Shows the count as a small badge on the trigger's corner
   * (Ludothek-Detailseite). Omit when the caller already shows the count
   * elsewhere (Admin-Verzeichnis, #210). */
  badgeCount?: number;
  className?: string;
}) {
  return (
    <Dialog>
      <Tooltip content="Alle Erklärbären ansehen">
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className={cn("relative", className)}
              aria-label="Alle Erklärbären ansehen"
            >
              <Search className="size-4" />
              {Boolean(badgeCount) && (
                <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[10px]">
                  {badgeCount}
                </Badge>
              )}
            </Button>
          }
        />
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Erklärbären für {boardGameTitle}</DialogTitle>
        </DialogHeader>
        <ExplainerBadgeList
          explainers={explainers}
          emptyLabel="Noch niemand als Erklärbär für dieses Spiel gemeldet."
        />
      </DialogContent>
    </Dialog>
  );
}

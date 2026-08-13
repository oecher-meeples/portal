import type { ReactNode } from "react";
import Link from "next/link";
import type { LudothekGame } from "@/lib/ludothek/browser";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { CopyCountSuffix } from "@/components/entities/copy-count-suffix";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";

/**
 * Dense list row for the `compact` view mode on `/ludothek` (games:manage
 * only, see Plan-Schritt 10) — the one row style with inline admin actions
 * (#121/#122).
 */
export function GameCompactRow({
  game,
  actions,
}: {
  game: LudothekGame & {
    /** Set once several copies of this title are folded into one row (#121/#122). */
    copyCount?: number;
  };
  /** Caller-supplied admin controls (edit/actions menu) — GameCompactRow just places them. */
  actions?: ReactNode;
}) {
  return (
    <Link
      href={`/ludothek/${game.boardGameSlug}`}
      className="hover:border-primary/60 flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm transition-colors"
    >
      <span className="flex-1 truncate font-medium">
        {game.title}
        <CopyCountSuffix copyCount={game.copyCount} />
      </span>
      <span className="text-muted-foreground truncate">
        {game.locationChain || "—"}
      </span>
      <GameZustandPill zustand={game.zustand} className="shrink-0" />
      {actions && (
        <StopRowNavigation className="flex shrink-0 items-center gap-1">
          {actions}
        </StopRowNavigation>
      )}
    </Link>
  );
}

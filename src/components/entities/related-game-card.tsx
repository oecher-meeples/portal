import { X } from "lucide-react";
import Link from "next/link";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { ActionButton } from "@/components/ui/action-button";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import type { ActionResult } from "@/components/ui/use-action";
import type { LudothekGameRef } from "@/lib/ludothek/browser";

/**
 * A linked title (base game or expansion) — cover left, title link and
 * standort right. Used symmetrically for both directions on the detail
 * page (#121/#122), replacing the earlier text pills. Optionally renders its
 * own remove control (Plan-Schritt 4) instead of relying on a separate list
 * of "Entfernen"-buttons below the cards.
 */
export function RelatedGameCard({
  game,
  locationChain,
  removeAction,
}: {
  game: LudothekGameRef;
  /** Only set for internal viewers — guests don't see standort (#121). */
  locationChain?: string;
  /** When set, renders a remove button that asks for confirmation before running. */
  removeAction?: () => Promise<ActionResult>;
}) {
  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="hover:border-primary/60 bg-card relative flex items-center gap-3 rounded-lg border p-2 transition-colors"
    >
      <GameCoverMedia
        imageUrl={game.imageUrl}
        title={game.title}
        aspect="aspect-square"
        className="size-14 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-medium">{game.title}</span>
        {locationChain !== undefined && (
          <span className="text-muted-foreground truncate text-xs">
            {locationChain || "—"}
          </span>
        )}
      </div>
      {removeAction && (
        <StopRowNavigation className="shrink-0">
          <ActionButton
            variant="outline"
            size="icon-sm"
            confirm={`"${game.title}" wirklich entfernen?`}
            action={removeAction}
            refresh
          >
            <X className="size-4" />
            <span className="sr-only">Entfernen</span>
          </ActionButton>
        </StopRowNavigation>
      )}
    </Link>
  );
}

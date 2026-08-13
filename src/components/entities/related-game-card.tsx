import Link from "next/link";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import type { LudothekGameRef } from "@/lib/ludothek/browser";

/**
 * A linked title (base game or expansion) — cover left, title link and
 * standort right. Used symmetrically for both directions on the detail
 * page (#121/#122), replacing the earlier text pills.
 */
export function RelatedGameCard({
  game,
  locationChain,
}: {
  game: LudothekGameRef;
  /** Only set for internal viewers — guests don't see standort (#121). */
  locationChain?: string;
}) {
  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="hover:border-primary/60 bg-card flex items-center gap-3 rounded-lg border p-2 transition-colors"
    >
      <GameCoverMedia
        imageUrl={game.imageUrl}
        title={game.title}
        aspect="aspect-square"
        className="size-14 shrink-0"
      />
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-medium">{game.title}</span>
        {locationChain !== undefined && (
          <span className="text-muted-foreground truncate text-xs">
            {locationChain || "—"}
          </span>
        )}
      </div>
    </Link>
  );
}

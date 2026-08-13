import Link from "next/link";
import type { LudothekGame } from "@/lib/ludothek/browser";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";

/**
 * Dense list row for the `compact` view mode on `/ludothek` (games:manage
 * only, see Plan-Schritt 10) — no admin actions, those stay exclusive to
 * `/admin/bestand`.
 */
export function GameCompactRow({ game }: { game: LudothekGame }) {
  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="hover:border-primary/60 flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm transition-colors"
    >
      <span className="flex-1 truncate font-medium">{game.title}</span>
      <span className="text-muted-foreground truncate">
        {game.locationChain || "—"}
      </span>
      <GameZustandPill zustand={game.zustand} className="shrink-0" />
    </Link>
  );
}

import Link from "next/link";
import type { BoardGame } from "@/data/games";
import { STATUS_LABELS } from "@/data/games";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { StatusPill, type StatusTone } from "@/components/shared/status-pill";

const STATUS_TONE: Record<BoardGame["status"], StatusTone> = {
  AVAILABLE: "positive",
  BORROWED: "warning",
  MAINTENANCE: "info",
};

export function GameCard({ game }: { game: BoardGame }) {
  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/60"
    >
      <PlaceholderMedia label="COVER" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary">
          {game.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {game.players} · {game.duration}
        </p>
        <StatusPill
          label={STATUS_LABELS[game.status]}
          tone={STATUS_TONE[game.status]}
          className="mt-auto w-fit"
        />
      </div>
    </Link>
  );
}

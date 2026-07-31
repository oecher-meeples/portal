import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicLudothekGame, LudothekGame } from "@/lib/ludothek/browser";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { CardCornerOverlay } from "@/components/ui/card-corner-overlay";
import type { GameZustand } from "@/lib/ludothek/holdings";

function playersAndDuration(game: PublicLudothekGame) {
  const players =
    game.minPlayers && game.maxPlayers
      ? `${game.minPlayers}–${game.maxPlayers}`
      : (game.minPlayers ?? game.maxPlayers ?? "?");
  const duration = game.playTimeMinutes ? `${game.playTimeMinutes}’` : "";
  return [players ? `${players} Spieler` : null, duration]
    .filter(Boolean)
    .join(" · ");
}

export function GameCard({
  game,
  actions,
}: {
  game: PublicLudothekGame | (LudothekGame & { zustand: GameZustand });
  /** Caller-supplied overlay, e.g. an edit button — GameCard just places it. */
  actions?: ReactNode;
}) {
  const zustand = "zustand" in game ? game.zustand : undefined;

  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="group bg-card hover:border-primary/60 relative flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      {actions && (
        <CardCornerOverlay corner="top-right">{actions}</CardCornerOverlay>
      )}
      <GameCoverMedia
        imageUrl={game.imageUrl}
        title={game.title}
        aspect="aspect-video"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-semibold">
          {game.title}
        </h3>
        <p className="text-muted-foreground text-sm">
          {playersAndDuration(game)}
        </p>
        {zustand && (
          <GameZustandPill zustand={zustand} className="mt-auto w-fit" />
        )}
      </div>
    </Link>
  );
}

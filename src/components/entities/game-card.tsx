import Link from "next/link";
import type { PublicLudothekGame, LudothekGame } from "@/lib/ludothek/browser";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
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
}: {
  game: PublicLudothekGame | (LudothekGame & { zustand: GameZustand });
}) {
  const zustand = "zustand" in game ? game.zustand : undefined;

  return (
    <Link
      href={`/ludothek/${game.slug}`}
      className="group bg-card hover:border-primary/60 flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <PlaceholderMedia label="COVER" />
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

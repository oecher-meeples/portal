import type { PublicLudothekGame } from "@/lib/ludothek/browser";

/** "3–4 Spieler · 90’" — shared between grid card and list row (see docs/project-structure.md). */
export function playersAndDuration(game: PublicLudothekGame) {
  const players =
    game.minPlayers && game.maxPlayers
      ? `${game.minPlayers}–${game.maxPlayers}`
      : (game.minPlayers ?? game.maxPlayers ?? "?");
  const duration = game.playTimeMinutes ? `${game.playTimeMinutes}’` : "";
  return [players ? `${players} Spieler` : null, duration]
    .filter(Boolean)
    .join(" · ");
}

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

/** Minuten → "H:MMh" (#427) — nur die Anzeige, der zugrunde liegende
 * Minuten-Wert in State/URL/DB bleibt unverändert (z. B. Dauer-Filter). */
export function formatDurationHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, "0")}h`;
}

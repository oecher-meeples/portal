"use client";

import { useState } from "react";
import type { PlayerCountFilter } from "@/lib/ludothek/browser";
import { Button } from "@/components/ui/button";

export type FreeGameEntry = {
  id: string;
  title: string;
  minPlayers: number | null;
  maxPlayers: number | null;
};

const PLAYER_FILTERS: { value: PlayerCountFilter | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "1-2", label: "1–2" },
  { value: "3-4", label: "3–4" },
  { value: "5+", label: "5+" },
];

function matchesPlayers(game: FreeGameEntry, filter: PlayerCountFilter) {
  const max = game.maxPlayers ?? game.minPlayers ?? 0;
  const min = game.minPlayers ?? max;
  if (filter === "1-2") return min <= 2;
  if (filter === "3-4") return max >= 3 && min <= 4;
  return max >= 5;
}

export function FreeGamesList({ games }: { games: FreeGameEntry[] }) {
  const [filter, setFilter] = useState<PlayerCountFilter | "all">("all");

  const filtered =
    filter === "all" ? games : games.filter((game) => matchesPlayers(game, filter));

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Was ist gerade frei?</h2>
      <div className="flex gap-2">
        {PLAYER_FILTERS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aktuell kein passendes Spiel im Raum verfügbar.
        </p>
      ) : (
        <ul className="text-sm">
          {filtered.map((game) => (
            <li key={game.id} className="border-b py-1.5 last:border-0">
              {game.title}
              {game.minPlayers && game.maxPlayers && (
                <span className="text-muted-foreground">
                  {" "}
                  · {game.minPlayers}–{game.maxPlayers} Spieler
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

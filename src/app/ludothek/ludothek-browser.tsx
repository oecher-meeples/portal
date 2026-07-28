"use client";

import { useState } from "react";
import { Search, ScanLine } from "lucide-react";
import type { BoardGame } from "@/data/games";
import { GameCard } from "@/components/domain/game-card";
import { PillToggle } from "@/components/ui/pill-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PLAYER_FILTERS = [
  { label: "Alle", value: "alle" },
  { label: "1â€“2", value: "1-2" },
  { label: "3â€“4", value: "3-4" },
  { label: "5+", value: "5+" },
] as const;

const DURATION_FILTERS = [
  { label: "Alle", value: "alle" },
  { label: "<60â€™", value: "short" },
  { label: "60â€“120â€™", value: "mid" },
  { label: ">120â€™", value: "long" },
] as const;

function maxPlayers(players: string) {
  const digits = players.replace(/[^0-9â€“-]/g, "").split(/[â€“-]/);
  return Number(digits[digits.length - 1] ?? digits[0]);
}

function maxDuration(duration: string) {
  const digits = duration.replace(/[^0-9â€“-]/g, "").split(/[â€“-]/);
  return Number(digits[digits.length - 1] ?? digits[0]);
}

export function LudothekBrowser({ games }: { games: BoardGame[] }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] =
    useState<(typeof PLAYER_FILTERS)[number]["value"]>("alle");
  const [duration, setDuration] =
    useState<(typeof DURATION_FILTERS)[number]["value"]>("alle");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const visible = games.filter((game) => {
    if (query && !game.title.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (onlyAvailable && game.status !== "AVAILABLE") return false;
    const players_ = maxPlayers(game.players);
    if (players === "1-2" && players_ > 2) return false;
    if (players === "3-4" && (players_ < 3 || players_ > 4)) return false;
    if (players === "5+" && players_ < 5) return false;
    const duration_ = maxDuration(game.duration);
    if (duration === "short" && duration_ >= 60) return false;
    if (duration === "mid" && (duration_ < 60 || duration_ > 120)) return false;
    if (duration === "long" && duration_ <= 120) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Spiel, Autor oder Barcode suchen â€¦"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2"
            render={
              <Link href="/scan">
                <ScanLine className="size-4" />
                Scannen
              </Link>
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-semibold tracking-wider uppercase">
            Spieler
          </span>
          <PillToggle
            options={[...PLAYER_FILTERS]}
            value={players}
            onChange={setPlayers}
          />
          <span className="text-muted-foreground font-semibold tracking-wider uppercase">
            Dauer
          </span>
          <PillToggle
            options={[...DURATION_FILTERS]}
            value={duration}
            onChange={setDuration}
          />
          <button
            type="button"
            onClick={() => setOnlyAvailable((v) => !v)}
            className={`rounded-full border px-3 py-1 font-medium transition-colors ${
              onlyAvailable
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nur verfÃ¼gbar
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            Keine Spiele gefunden.
          </p>
        )}
      </div>
    </div>
  );
}

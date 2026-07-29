import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";
import { GameActionsPanel } from "@/components/feature/scan/game-actions-panel";

const ZUSTAND_TONE: Record<GameZustand, StatusTone> = {
  frei: "positive",
  ausgeliehen: "info",
  wartung: "warning",
  "nicht-erfasst": "neutral",
};

const ZUSTAND_LABELS: Record<GameZustand, string> = {
  frei: "Frei",
  ausgeliehen: "Ausgeliehen",
  wartung: "Wartung",
  "nicht-erfasst": "Nicht erfasst",
};

export type HoldingHistoryEntry = {
  id: string;
  origin: string;
  target: string;
  startedAt: string;
  endedAt: string | null;
  confirmedAt: string | null;
  recordedByName: string;
};

export function GameDetailView({
  game,
  internal,
}: {
  game: PublicLudothekGame;
  internal?: {
    zustand: GameZustand;
    locationChain: string;
    responsibleName: string | null;
    history: HoldingHistoryEntry[];
  };
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4">
        <PlaceholderMedia label="COVER" aspect="aspect-[3/4]" />
        {internal && (
          <StatusPill
            label={ZUSTAND_LABELS[internal.zustand]}
            tone={ZUSTAND_TONE[internal.zustand]}
            className="w-fit"
          />
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            {game.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {game.minPlayers && game.maxPlayers
              ? `${game.minPlayers}–${game.maxPlayers} Spieler`
              : null}
            {game.playTimeMinutes ? ` · ${game.playTimeMinutes} Min.` : ""}
            {game.weight ? ` · Gewichtung ${game.weight.toFixed(1)}/5` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {game.mechanics.map((mechanic) => (
            <span
              key={mechanic}
              className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
            >
              {mechanic}
            </span>
          ))}
        </div>

        {internal && (
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Standort</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {internal.locationChain || "—"}
            </p>
            <p className="text-muted-foreground text-sm">
              Verantwortlich: {internal.responsibleName ?? "—"}
            </p>

            <div className="mt-4 border-t pt-4">
              <GameActionsPanel
                boardGameId={game.id}
                seriesMode={null}
                onDone={() => {}}
              />
            </div>
          </div>
        )}

        {internal && internal.history.length > 0 && (
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Aufenthalts-Historie</h2>
            <ul className="mt-3 flex flex-col divide-y text-sm">
              {internal.history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 py-2.5">
                  <span className="font-medium">
                    {entry.origin} → {entry.target}
                    {!entry.confirmedAt && (
                      <StatusPill
                        label="unbestätigt"
                        tone="warning"
                        className="ml-2"
                      />
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {entry.startedAt}
                    {entry.endedAt ? ` – ${entry.endedAt}` : " – aktuell"} · erfasst
                    von {entry.recordedByName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

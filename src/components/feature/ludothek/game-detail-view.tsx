import type { ExplainerExperienceLevel } from "@prisma/client";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { ExplainerVideo } from "@/components/entities/explainer-video";
import { ExplainerGamePanel } from "@/components/feature/ludothek/explainer-game-panel";
import {
  AssignExpansionDialog,
  type GameOption,
} from "@/components/widgets/board-game/assign-expansion-dialog";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";
import type { ExplainerEntry } from "@/lib/explainer/queries";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";

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
  explainer,
  expansionAssignment,
}: {
  game: PublicLudothekGame;
  internal?: {
    zustand: GameZustand;
    locationChain: string;
    responsibleName: string | null;
    history: HoldingHistoryEntry[];
  };
  /** Nur für eingeloggte Nutzer gesetzt — Erklärbär-Selbstauskunft ist kein Gast-Feature. */
  explainer?: {
    entries: ExplainerEntry[];
    myLevel: ExplainerExperienceLevel | null;
  };
  /** Only set for `games:manage` holders — manual base game ↔ expansion pflege (#30). */
  expansionAssignment?: {
    options: GameOption[];
  };
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4">
        <GameCoverMedia imageUrl={game.imageUrl} title={game.title} />
        {internal && (
          <GameZustandPill zustand={internal.zustand} className="w-fit" />
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

        {game.baseGames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Erweiterung zu:
            </span>
            {game.baseGames.map((baseGame) => (
              <span
                key={baseGame.id}
                className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
              >
                {baseGame.title}
              </span>
            ))}
          </div>
        )}

        {game.expansions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-sm">
              Erweiterungen:
            </span>
            <div className="flex flex-wrap gap-2">
              {game.expansions.map((expansion) => (
                <span
                  key={expansion.id}
                  className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
                >
                  {expansion.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {expansionAssignment && (
          <AssignExpansionDialog
            game={{ id: game.boardGameId, kind: game.kind }}
            linked={
              game.kind === "BOARDGAME_EXPANSION"
                ? game.baseGames
                : game.expansions
            }
            options={expansionAssignment.options}
          />
        )}

        {(game.description || game.explainerVideoUrl) && (
          <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Erklärung</h2>
            {game.description && (
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {game.description}
              </p>
            )}
            {game.explainerVideoUrl && (
              <ExplainerVideo url={game.explainerVideoUrl} />
            )}
          </div>
        )}

        {explainer && (
          <ExplainerGamePanel
            boardGameId={game.boardGameId}
            boardGameTitle={game.title}
            explainers={explainer.entries}
            myLevel={explainer.myLevel}
          />
        )}

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
              <GameHoldingPanel gameCopyId={game.id} />
            </div>
          </div>
        )}

        {internal && internal.history.length > 0 && (
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">
              Aufenthalts-Historie
            </h2>
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
                    {entry.endedAt ? ` – ${entry.endedAt}` : " – aktuell"} ·
                    erfasst von {entry.recordedByName}
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

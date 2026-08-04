"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/pill-toggle";
import { CodeScanner } from "@/components/ui/code-scanner";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";
import { PruefbogenPanel } from "@/components/feature/scan/pruefbogen-panel";
import {
  scanPlaceGameInUnit,
  scanResolveCode,
} from "@/lib/ludothek/holding-actions";
import type { ResolvedScan } from "@/lib/ludothek/holdings";

export type SeriesMode =
  | { type: "einlagern"; unitId: string; unitCode: string }
  | { type: "pruefen" }
  | null;

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown"; raw: string }
  | { kind: "select-game"; games: { id: string; title: string }[] }
  | { kind: "game"; gameCopyId: string }
  | { kind: "pruefen"; gameCopyId: string; title: string }
  | {
      kind: "unit";
      unitId: string;
      code: string;
      label: string;
      contents: string[];
    };

export function ScanView({ canManageGames }: { canManageGames: boolean }) {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [manualInput, setManualInput] = useState("");
  const [seriesMode, setSeriesMode] = useState<SeriesMode>(null);
  const [seriesLog, setSeriesLog] = useState<string[]>([]);
  const [lastRaw, setLastRaw] = useState("");

  async function handleResolved(resolved: ResolvedScan) {
    if (resolved.kind === "unknown") {
      setState({ kind: "unknown", raw: resolved.raw });
      return;
    }

    if (resolved.kind === "unit") {
      if (seriesMode?.type === "einlagern") {
        setSeriesLog((log) => [
          `Einheit ${resolved.unit.code} kann nicht in sich selbst eingelagert werden.`,
          ...log,
        ]);
        return;
      }
      setState({
        kind: "unit",
        unitId: resolved.unit.id,
        code: resolved.unit.code,
        label: resolved.unit.label,
        contents: resolved.contents.map((g) => g.boardGame.title),
      });
      return;
    }

    // resolved.kind === "games"
    if (seriesMode?.type === "einlagern") {
      for (const game of resolved.games) {
        const result = await scanPlaceGameInUnit(game.id, seriesMode.unitId);
        setSeriesLog((log) => [
          result.error
            ? `${game.boardGame.title}: ${result.error}`
            : `${game.boardGame.title} → ${seriesMode.unitCode}`,
          ...log,
        ]);
      }
      return;
    }

    if (resolved.games.length === 1) {
      const game = resolved.games[0];
      setState(
        seriesMode?.type === "pruefen"
          ? { kind: "pruefen", gameCopyId: game.id, title: game.boardGame.title }
          : { kind: "game", gameCopyId: game.id },
      );
      return;
    }
    setState({
      kind: "select-game",
      games: resolved.games.map((g) => ({
        id: g.id,
        title: g.condition ? `${g.boardGame.title} (${g.condition})` : g.boardGame.title,
      })),
    });
  }

  async function handleCode(raw: string) {
    setLastRaw(raw);
    const resolved = await scanResolveCode(raw);
    await handleResolved(resolved);
  }

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CodeScanner onDetected={handleCode} />

        <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-code" className="text-sm font-medium">
              Manuelle Eingabe
            </label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="OM-BOX-0001 oder EAN"
              />
              <Button
                onClick={() => {
                  if (manualInput.trim()) handleCode(manualInput.trim());
                }}
              >
                Suchen
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Serienmodus</span>
            <PillToggle
              options={[
                { value: "aus", label: "Aus" },
                { value: "pruefen", label: "Prüfen" },
              ]}
              value={seriesMode?.type === "pruefen" ? "pruefen" : "aus"}
              onChange={(value) => {
                setSeriesMode(value === "pruefen" ? { type: "pruefen" } : null);
                setSeriesLog([]);
              }}
            />
            {seriesMode?.type === "einlagern" && (
              <p className="bg-primary/10 rounded-md p-2 text-sm">
                Alles was jetzt gescannt wird, wird eingelagert in{" "}
                <strong>{seriesMode.unitCode}</strong>.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setSeriesMode(null)}
                >
                  beenden
                </button>
              </p>
            )}
            {seriesMode && seriesLog.length > 0 && (
              <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                {seriesLog.slice(0, 8).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-4">
            {state.kind === "idle" && (
              <p className="text-muted-foreground text-sm">
                Noch nichts gescannt.
              </p>
            )}

            {state.kind === "unknown" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Nicht im Bestand</p>
                <p className="text-muted-foreground text-sm">
                  Code: <span className="font-mono">{state.raw}</span>
                </p>
                {canManageGames && (
                  <Link
                    href={`/admin/bestand?ean=${encodeURIComponent(state.raw)}`}
                    className="text-primary text-sm hover:underline"
                  >
                    Spiel jetzt anlegen →
                  </Link>
                )}
              </div>
            )}

            {state.kind === "select-game" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Mehrere Spiele mit dieser EAN — welches?
                </p>
                <div className="flex flex-col gap-1">
                  {state.games.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      className="hover:bg-muted rounded-md border px-3 py-2 text-left text-sm"
                      onClick={() =>
                        setState(
                          seriesMode?.type === "pruefen"
                            ? {
                                kind: "pruefen",
                                gameCopyId: game.id,
                                title: game.title,
                              }
                            : { kind: "game", gameCopyId: game.id },
                        )
                      }
                    >
                      {game.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {state.kind === "game" && (
              <GameHoldingPanel
                gameCopyId={state.gameCopyId}
                advanceAfterAction={Boolean(seriesMode)}
                onDone={reset}
              />
            )}

            {state.kind === "pruefen" && (
              <PruefbogenPanel
                gameCopyId={state.gameCopyId}
                title={state.title}
                onDone={reset}
              />
            )}

            {state.kind === "unit" && (
              <div className="flex flex-col gap-2">
                <p className="font-serif text-lg font-bold">{state.label}</p>
                <p className="text-muted-foreground font-mono text-sm">
                  {state.code}
                </p>
                <div>
                  <p className="text-sm font-medium">
                    Inhalt ({state.contents.length})
                  </p>
                  {state.contents.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Leer.</p>
                  ) : (
                    <ul className="text-muted-foreground text-sm">
                      {state.contents.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    setSeriesMode({
                      type: "einlagern",
                      unitId: state.unitId,
                      unitCode: state.code,
                    });
                    setSeriesLog([]);
                    reset();
                  }}
                >
                  Serienmodus: Einlagern in {state.code}
                </Button>
              </div>
            )}

            {(state.kind === "unknown" ||
              state.kind === "game" ||
              state.kind === "pruefen") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={reset}
              >
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>
      </div>

      {lastRaw && (
        <p className="text-muted-foreground text-xs">
          Zuletzt gescannt: <span className="font-mono">{lastRaw}</span>
        </p>
      )}
    </div>
  );
}

"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";
import { RelocateConfirmPanel } from "@/components/feature/scan/relocate-confirm-panel";
import { CopyChoiceList } from "@/components/feature/scan/scan-series-log";
import type { ScanModeHandle } from "@/components/feature/scan/use-scan-series";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { scanTransferGame } from "@/lib/ludothek/scanner-actions";
import type { ResolvedScan } from "@/lib/ludothek/holdings";
import { toCopyChoices, type CopyChoice } from "@/lib/ludothek/scanner-modes";

type EinlagernSeries = { unitId: string; unitCode: string } | null;

type UnitView = { id: string; code: string; label: string; contents: string[] };

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown"; raw: string }
  | {
      kind: "select-game";
      games: CopyChoice[];
      /** Selecting here places directly into the active Einlagern-Kiste
       * instead of opening the GameHoldingPanel (#5). */
      forEinlagern: boolean;
    }
  | { kind: "game"; gameCopyId: string }
  | ({ kind: "unit" } & UnitView)
  | {
      kind: "confirm-relocate";
      game: { id: string; title: string };
      fromUnitCode: string;
      toUnit: UnitView;
    };

/**
 * Einzel-Scan (bisheriger `/scan`-Ablauf): Spiel → `GameHoldingPanel`,
 * Einheit → Inhalt + Einlagern-Serie, mehrdeutige EAN → Exemplar-Auswahl.
 * Die Einlagern-Serie geht in #539 in „Übergeben" auf.
 */
export function SingleScan({
  ref,
  canManageGames,
}: {
  ref: Ref<ScanModeHandle>;
  canManageGames: boolean;
}) {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [einlagern, setEinlagern] = useState<EinlagernSeries>(null);
  const [seriesLog, setSeriesLog] = useState<string[]>([]);
  const [lastPlacedGame, setLastPlacedGame] = useState<{
    id: string;
    title: string;
  } | null>(null);

  async function placeInActiveUnit(
    game: { id: string; title: string },
    unit: { id: string; code: string },
  ) {
    const target = { kind: "unit", unitId: unit.id } as const;
    const { error, value } = await scanTransferGame(game.id, target);
    const line = error
      ? `${game.title}: ${error}`
      : value?.outcome === "already-there"
        ? `${game.title} liegt schon in ${unit.code}`
        : `${game.title} → ${unit.code}`;
    setSeriesLog((log) => [line, ...log]);
    if (!error) setLastPlacedGame(game);
  }

  function startEinlagern(unit: { id: string; code: string }) {
    setEinlagern({ unitId: unit.id, unitCode: unit.code });
    setState({ kind: "idle" });
  }

  function openGame(game: CopyChoice) {
    setState({ kind: "game", gameCopyId: game.id });
  }

  function handleUnit(unit: UnitView) {
    if (!einlagern) {
      setState({ kind: "unit", ...unit });
      return;
    }
    if (unit.id === einlagern.unitId) {
      setSeriesLog((log) => [
        `Einheit ${unit.code} kann nicht in sich selbst eingelagert werden.`,
        ...log,
      ]);
      return;
    }
    if (!lastPlacedGame) {
      startEinlagern(unit);
      return;
    }
    setState({
      kind: "confirm-relocate",
      game: lastPlacedGame,
      fromUnitCode: einlagern.unitCode,
      toUnit: unit,
    });
  }

  async function handleResolved(resolved: ResolvedScan) {
    if (resolved.kind === "unknown") {
      setState({ kind: "unknown", raw: resolved.raw });
      return;
    }
    // #465: Meeple-QR-Code hat im Einzel-Scan keine Bedeutung — nur die
    // Weitergabe-/Rückgabe-Zielauswahl (TargetPicker) versteht ihn.
    if (resolved.kind === "meeple") {
      setState({ kind: "unknown", raw: resolved.meeple.displayName });
      return;
    }
    if (resolved.kind === "unit") {
      handleUnit({
        id: resolved.unit.id,
        code: resolved.unit.code,
        label: resolved.unit.label,
        contents: resolved.contents.map((g) => g.boardGame.title),
      });
      return;
    }

    const games = toCopyChoices(resolved.games);
    if (games.length > 1) {
      setState({
        kind: "select-game",
        games,
        forEinlagern: Boolean(einlagern),
      });
      return;
    }
    if (einlagern) {
      const unit = { id: einlagern.unitId, code: einlagern.unitCode };
      await placeInActiveUnit(
        { id: games[0].id, title: resolved.games[0].boardGame.title },
        unit,
      );
      return;
    }
    openGame(games[0]);
  }

  async function handleRelocateConfirm(
    confirmState: Extract<ViewState, { kind: "confirm-relocate" }>,
    relocate: boolean,
  ) {
    if (relocate) {
      await placeInActiveUnit(confirmState.game, confirmState.toUnit);
    }
    startEinlagern(confirmState.toUnit);
  }

  function pickGame(game: CopyChoice, forEinlagern: boolean) {
    if (forEinlagern && einlagern) {
      void placeInActiveUnit(game, {
        id: einlagern.unitId,
        code: einlagern.unitCode,
      });
      setState({ kind: "idle" });
      return;
    }
    openGame(game);
  }

  useImperativeHandle(ref, () => ({
    handleCode: async (raw) => handleResolved(await scanResolveCode(raw)),
  }));

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-4">
      {einlagern && (
        <div className="flex flex-col gap-1.5">
          <p className="bg-primary/10 rounded-md p-2 text-sm">
            Alles was jetzt gescannt wird, wird eingelagert in{" "}
            <strong>{einlagern.unitCode}</strong>.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setEinlagern(null);
                setLastPlacedGame(null);
              }}
            >
              beenden
            </button>
          </p>
          {seriesLog.length > 0 && (
            <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
              {seriesLog.slice(0, 8).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        {state.kind === "idle" && (
          <p className="text-muted-foreground text-sm">Noch nichts gescannt.</p>
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
          <CopyChoiceList
            games={state.games}
            onPick={(game) => pickGame(game, state.forEinlagern)}
          />
        )}

        {state.kind === "game" && (
          <GameHoldingPanel
            gameCopyId={state.gameCopyId}
            advanceAfterAction={Boolean(einlagern)}
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
                setSeriesLog([]);
                setLastPlacedGame(null);
                startEinlagern(state);
              }}
            >
              Serienmodus: Einlagern in {state.code}
            </Button>
          </div>
        )}

        {state.kind === "confirm-relocate" && (
          <RelocateConfirmPanel
            game={state.game}
            fromUnitCode={state.fromUnitCode}
            toUnitCode={state.toUnit.code}
            onConfirm={(relocate) =>
              void handleRelocateConfirm(state, relocate)
            }
          />
        )}

        {(state.kind === "unknown" || state.kind === "game") && (
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Zurücksetzen
          </Button>
        )}
      </div>
    </div>
  );
}

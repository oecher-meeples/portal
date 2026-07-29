"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  scanAcceptHandover,
  scanAcceptReturn,
  scanBorrowGame,
  scanConfirmHolding,
  scanGetGameContext,
  scanGiveToMeeple,
  scanListMeeples,
  scanPlaceGameInUnit,
  scanResolveCode,
  scanReturnToMeeple,
  type ScannedGameContext,
} from "@/components/feature/scan/actions";
import type { SeriesMode } from "@/components/feature/scan/scan-view";

type MeeplePickerFor = "handover" | "return-to-person" | null;

export function GameActionsPanel({
  boardGameId,
  seriesMode,
  onDone,
}: {
  boardGameId: string;
  seriesMode: SeriesMode;
  onDone: () => void;
}) {
  const [context, setContext] = useState<ScannedGameContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetCodeInput, setTargetCodeInput] = useState("");
  const [meeplePicker, setMeeplePicker] = useState<MeeplePickerFor>(null);
  const [meeples, setMeeples] = useState<{ id: string; displayName: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    scanGetGameContext(boardGameId).then((result) => {
      if (!cancelled) {
        setContext(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [boardGameId]);

  async function openMeeplePicker(target: MeeplePickerFor) {
    setMeeplePicker(target);
    if (meeples.length === 0) {
      setMeeples(await scanListMeeples());
    }
  }

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    setMeeplePicker(null);
    const result = await action();
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Erledigt.");
    if (seriesMode) {
      onDone();
    } else {
      setContext(await scanGetGameContext(boardGameId));
    }
  }

  async function handlePlaceInUnit() {
    const code = targetCodeInput.trim();
    if (!code) return;

    const resolved = await scanResolveCode(code);
    if (resolved.kind !== "unit") {
      setError("Kein Einheiten-Code erkannt.");
      return;
    }
    await run(() => scanPlaceGameInUnit(boardGameId, resolved.unit.id));
    setTargetCodeInput("");
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Lade …</p>;
  }
  if (!context) {
    return <p className="text-destructive text-sm">Spiel nicht gefunden.</p>;
  }

  const { game, holding, isSelf } = context;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="font-serif text-lg font-bold">{game.title}</p>
        {holding?.confirmedAt === null && holding.meepleId && (
          <StatusPill label="unbestätigt" tone="warning" />
        )}
      </div>

      {holding?.unitId && (
        <p className="text-muted-foreground text-sm">
          Liegt in {holding.unitLabel} ({holding.unitCode})
        </p>
      )}
      {holding?.meepleId && (
        <p className="text-muted-foreground text-sm">
          {isSelf ? "Liegt bei dir" : `Liegt bei ${holding.meepleName}`}
        </p>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && !error && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {holding?.unitId && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => run(() => scanBorrowGame(game.id))}
          >
            Ausleihen
          </Button>
        )}

        {holding?.meepleId && isSelf && (
          <>
            {!holding.confirmedAt && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => run(() => scanConfirmHolding(holding.id))}
              >
                Bestätigen
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => openMeeplePicker("handover")}
            >
              Weitergeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => openMeeplePicker("return-to-person")}
            >
              An Person zurückgeben
            </Button>
          </>
        )}

        {holding?.meepleId && !isSelf && (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run(() => scanAcceptHandover(game.id))}
            >
              Ich habe es erhalten
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => scanAcceptReturn(game.id))}
            >
              Ich nehme es zur Rückgabe an
            </Button>
          </>
        )}
      </div>

      {meeplePicker && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Person auswählen</p>
          <div className="flex flex-wrap gap-2">
            {meeples.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    meeplePicker === "handover"
                      ? scanGiveToMeeple(game.id, m.id)
                      : scanReturnToMeeple(game.id, m.id),
                  )
                }
              >
                {m.displayName}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setMeeplePicker(null)}>
            Abbrechen
          </Button>
        </div>
      )}

      {(holding?.unitId || holding?.meepleId) && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              In Einheit legen (Code)
            </label>
            <input
              value={targetCodeInput}
              onChange={(event) => setTargetCodeInput(event.target.value)}
              placeholder="OM-BOX-0002"
              className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !targetCodeInput.trim()}
            onClick={handlePlaceInUnit}
          >
            {holding.unitId ? "Umlagern" : "Einlagern"}
          </Button>
        </div>
      )}
    </div>
  );
}

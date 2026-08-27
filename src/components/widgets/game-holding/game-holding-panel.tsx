"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useAction } from "@/components/ui/use-action";
import { MeepleCombobox } from "@/components/entities/meeple-combobox";
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
} from "@/lib/ludothek/holding-actions";

type MeeplePickerFor = "handover" | "return-to-person" | null;

/**
 * Everything you can do with a single game you currently have in hand —
 * borrow, confirm, hand over, return, put into a storage unit.
 *
 * A widget, not a feature: the same use case is entered from the scan flow,
 * the ludothek detail page and the dashboard, so it belongs to none of them.
 */
export function GameHoldingPanel({
  gameCopyId,
  advanceAfterAction = false,
  onDone,
}: {
  gameCopyId: string;
  /** In series mode the caller moves on instead of re-showing this game. */
  advanceAfterAction?: boolean;
  onDone?: () => void;
}) {
  // Keyed by gameCopyId so "still loading" is derived, never set in an effect.
  const [loaded, setLoaded] = useState<{
    id: string;
    context: ScannedGameContext | null;
  } | null>(null);
  const [meeplePicker, setMeeplePicker] = useState<MeeplePickerFor>(null);
  const [meeples, setMeeples] = useState<{ id: string; displayName: string }[]>(
    [],
  );
  const [targetCodeInput, setTargetCodeInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { run, pending, error, setError } = useAction({ refresh: false });

  const isCurrent = loaded?.id === gameCopyId;
  const context = isCurrent ? loaded.context : null;

  useEffect(() => {
    let cancelled = false;
    scanGetGameContext(gameCopyId).then((result) => {
      if (!cancelled) setLoaded({ id: gameCopyId, context: result });
    });
    return () => {
      cancelled = true;
    };
  }, [gameCopyId]);

  async function openMeeplePicker(target: MeeplePickerFor) {
    setMeeplePicker(target);
    if (meeples.length === 0) setMeeples(await scanListMeeples());
  }

  async function perform(action: () => Promise<{ error?: string }>) {
    setMeeplePicker(null);
    const ok = await run(action);
    if (!ok) return;

    setMessage("Erledigt.");
    if (advanceAfterAction) {
      onDone?.();
      return;
    }
    setLoaded({
      id: gameCopyId,
      context: await scanGetGameContext(gameCopyId),
    });
  }

  async function handlePlaceInUnit() {
    const code = targetCodeInput.trim();
    if (!code) return;

    const resolved = await scanResolveCode(code);
    if (resolved.kind !== "unit") {
      setError("Kein Einheiten-Code erkannt.");
      return;
    }
    await perform(() => scanPlaceGameInUnit(gameCopyId, resolved.unit.id));
    setTargetCodeInput("");
  }

  if (!isCurrent) {
    return <p className="text-muted-foreground text-sm">Lade …</p>;
  }
  if (!context) {
    return <p className="text-destructive text-sm">Spiel nicht gefunden.</p>;
  }

  const { game, holding, isSelf } = context;
  const isWithSelf = Boolean(holding?.meepleId) && isSelf;
  const isWithOther = Boolean(holding?.meepleId) && !isSelf;

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
      {message && !error && (
        <p className="text-sm text-emerald-600">{message}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {holding?.unitId && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => perform(() => scanBorrowGame(game.id))}
          >
            Ausleihen
          </Button>
        )}

        {isWithSelf && (
          <>
            {!holding?.confirmedAt && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => perform(() => scanConfirmHolding(holding!.id))}
              >
                Bestätigen
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openMeeplePicker("handover")}
            >
              Weitergeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openMeeplePicker("return-to-person")}
            >
              An Person zurückgeben
            </Button>
          </>
        )}

        {isWithOther && (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => perform(() => scanAcceptHandover(game.id))}
            >
              Ich habe es erhalten
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => perform(() => scanAcceptReturn(game.id))}
            >
              Ich nehme es zur Rückgabe an
            </Button>
          </>
        )}
      </div>

      {meeplePicker && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Person auswählen</p>
          <MeepleCombobox
            options={meeples}
            value={null}
            onValueChange={(meepleId) => {
              if (!meepleId) return;
              perform(() =>
                meeplePicker === "handover"
                  ? scanGiveToMeeple(game.id, meepleId)
                  : scanReturnToMeeple(game.id, meepleId),
              );
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMeeplePicker(null)}
          >
            Abbrechen
          </Button>
        </div>
      )}

      {(holding?.unitId || holding?.meepleId) && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="holding-target-code"
              className="text-muted-foreground text-xs"
            >
              In Einheit legen (Code)
            </label>
            <Input
              id="holding-target-code"
              value={targetCodeInput}
              onChange={(event) => setTargetCodeInput(event.target.value)}
              placeholder="OM-BOX-0002"
              className="h-8 w-auto"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !targetCodeInput.trim()}
            onClick={handlePlaceInUnit}
          >
            {holding?.unitId ? "Umlagern" : "Einlagern"}
          </Button>
        </div>
      )}
    </div>
  );
}

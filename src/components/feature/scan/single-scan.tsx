"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";
import {
  CopyChoiceList,
  ScanLogCard,
} from "@/components/feature/scan/scan-series-log";
import { useScanLog } from "@/components/feature/scan/use-scan-log";
import type { ScanModeHandle } from "@/components/feature/scan/use-scan-series";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import type { ResolvedScan } from "@/lib/ludothek/holdings";
import {
  SINGLE_SCAN_LOG_POLICY,
  type ScanLogEntry,
} from "@/lib/ludothek/scan-log";
import { toCopyChoices, type CopyChoice } from "@/lib/ludothek/scanner-modes";
import {
  formatShortIdSlug,
  shortIdFromUnitCode,
} from "@/lib/short-id/short-id";

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown"; raw: string }
  | { kind: "select-game"; games: CopyChoice[] }
  | { kind: "game"; gameCopyId: string }
  | {
      kind: "unit";
      id: string;
      code: string;
      label: string;
      contents: string[];
    };

/** „Zuletzt gescannt" (#574): Rohcode zum erneuten Auflösen + Anzeigename. */
type RecentScan = ScanLogEntry & { raw: string; label: string };

/** `Ark Nova · inv-189`, `Kiste A · box-0001`, sonst der Rohwert. */
function recentScanLabel(resolved: ResolvedScan, raw: string): string {
  switch (resolved.kind) {
    case "unknown":
      return raw;
    case "meeple":
      return resolved.meeple.displayName;
    case "unit": {
      const shortId = shortIdFromUnitCode(resolved.unit.code);
      return `${resolved.unit.label} · ${shortId ? formatShortIdSlug(shortId) : resolved.unit.code}`;
    }
    case "games": {
      const games = toCopyChoices(resolved.games);
      const [first] = games;
      if (games.length > 1 || first.inventoryNumber === null) {
        return `${first.title} · ${raw}`;
      }
      return `${first.title} · ${formatShortIdSlug({ kind: "inv", id: first.inventoryNumber })}`;
    }
  }
}

/**
 * Einzel-Scan (Standardmodus von `/scan`): Spiel → `GameHoldingPanel`,
 * Einheit → Inhalt, mehrdeutige EAN → Exemplar-Auswahl. Die frühere
 * Einlagern-Serie ist im Modus „Übergeben" mit Ziel Einheit aufgegangen
 * (#539) — der Button an der Einheit wechselt genau dorthin.
 */
export function SingleScan({
  ref,
  canManageGames,
  onFillUnit,
  onRescan,
}: {
  ref: Ref<ScanModeHandle>;
  canManageGames: boolean;
  /** Wechselt in „Übergeben" mit dieser Einheit als Ziel. */
  onFillUnit: (unitId: string) => void;
  /** Ein Log-Eintrag wird angetippt — wie ein erneuter Scan des Codes. */
  onRescan: (raw: string) => void;
}) {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const recent = useScanLog<RecentScan>(
    "single",
    SINGLE_SCAN_LOG_POLICY,
    (entry) => entry.raw,
  );

  function handleResolved(resolved: ResolvedScan) {
    if (resolved.kind === "unknown") {
      setState({ kind: "unknown", raw: resolved.raw });
      return;
    }
    // #465: Meeple-QR-Code hat im Einzel-Scan keine Bedeutung — nur die
    // Zielwahl (Modus „Übergeben", GameHoldingPanel) versteht ihn.
    if (resolved.kind === "meeple") {
      setState({ kind: "unknown", raw: resolved.meeple.displayName });
      return;
    }
    if (resolved.kind === "unit") {
      setState({
        kind: "unit",
        id: resolved.unit.id,
        code: resolved.unit.code,
        label: resolved.unit.label,
        contents: resolved.contents.map((g) => g.boardGame.title),
      });
      return;
    }
    const games = toCopyChoices(resolved.games);
    setState(
      games.length > 1
        ? { kind: "select-game", games }
        : { kind: "game", gameCopyId: games[0].id },
    );
  }

  useImperativeHandle(ref, () => ({
    handleCode: async (raw) => {
      const resolved = await scanResolveCode(raw);
      recent.add({ raw, label: recentScanLabel(resolved, raw) });
      handleResolved(resolved);
    },
  }));

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <>
      <Card className="gap-0">
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
            onPick={(game) => setState({ kind: "game", gameCopyId: game.id })}
          />
        )}

        {state.kind === "game" && (
          <GameHoldingPanel gameCopyId={state.gameCopyId} onDone={reset} />
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
              onClick={() => onFillUnit(state.id)}
            >
              Serienmodus: Einlagern in {state.code}
            </Button>
          </div>
        )}

        {(state.kind === "unknown" || state.kind === "game") && (
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Zurücksetzen
          </Button>
        )}
      </Card>

      <ScanLogCard
        title="Zuletzt gescannt"
        emptyHint="Keine Scans in den letzten 24 Stunden."
        isEmpty={recent.entries.length === 0}
      >
        {recent.entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              className="hover:text-primary w-full cursor-pointer py-1.5 text-left"
              onClick={() => onRescan(entry.raw)}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ScanLogCard>
    </>
  );
}

"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { scanReceiveGame } from "@/lib/ludothek/scanner-actions";
import {
  RECEIVE_OUTCOME_LABELS,
  spieleCount,
  toCopyChoices,
  type CopyChoice,
} from "@/lib/ludothek/scanner-modes";
import {
  ScanSeriesLog,
  UnitBulkDialog,
  type UnitBulkPrompt,
} from "@/components/feature/scan/scan-series-log";
import {
  resultBooking,
  unknownScanText,
  useScanSeries,
  type ScanModeHandle,
} from "@/components/feature/scan/use-scan-series";

/**
 * Modus „Erhalten" (#538): jedes gescannte Spiel landet bestätigt bei mir —
 * aus einer Einheit ausgeliehen, von einer anderen Person übernommen oder
 * eine offene Übergabe bestätigt. Die Buchung wählt `scanReceiveGame`.
 * Eine gescannte Einheit bietet nach Rückfrage an, alle Spiele darin zu
 * erhalten.
 */
export function ReceiveSeries({ ref }: { ref: Ref<ScanModeHandle> }) {
  const [unitPrompt, setUnitPrompt] = useState<
    (UnitBulkPrompt & { games: CopyChoice[] }) | null
  >(null);
  const series = useScanSeries({
    mode: "receive",
    book: async (game) =>
      resultBooking(game, await scanReceiveGame(game.id), ({ outcome }) => ({
        label: RECEIVE_OUTCOME_LABELS[outcome],
        tone: outcome === "already-mine" ? "info" : "success",
        counts: outcome === "already-mine" ? 0 : 1,
      })),
    onOtherScan: (resolved) => {
      if (resolved.kind === "unit") {
        if (resolved.contents.length === 0) {
          return { tone: "info", text: `${resolved.unit.label} ist leer.` };
        }
        setUnitPrompt({
          label: resolved.unit.label,
          count: resolved.contents.length,
          games: toCopyChoices(resolved.contents),
        });
        return null;
      }
      return {
        tone: "info",
        text:
          resolved.kind === "unknown"
            ? unknownScanText(resolved)
            : "Im Modus Erhalten nur Spiele oder Einheiten scannen.",
      };
    },
  });

  useImperativeHandle(ref, () => ({ handleCode: series.handleCode }));

  return (
    <ScanSeriesLog
      series={series}
      countLabel={(count) => `${spieleCount(count)} erhalten`}
      emptyHint="Noch nichts gescannt."
    >
      <p className="text-muted-foreground text-sm">
        Scanne nacheinander alle Spiele, die du bekommst. Jedes wird sofort
        bestätigt auf dich gebucht.
      </p>
      <UnitBulkDialog
        unit={unitPrompt}
        verb="erhalten"
        onConfirm={() => series.bookAll(unitPrompt?.games ?? [])}
        onClose={() => setUnitPrompt(null)}
      />
    </ScanSeriesLog>
  );
}

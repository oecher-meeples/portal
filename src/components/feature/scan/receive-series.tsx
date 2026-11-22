"use client";

import { useImperativeHandle, type Ref } from "react";
import { scanReceiveGame } from "@/lib/ludothek/scanner-actions";
import {
  RECEIVE_OUTCOME_LABELS,
  spieleCount,
} from "@/lib/ludothek/scanner-modes";
import { ScanSeriesLog } from "@/components/feature/scan/scan-series-log";
import {
  resultBooking,
  useScanSeries,
  type ScanModeHandle,
} from "@/components/feature/scan/use-scan-series";

/**
 * Modus „Erhalten" (#538): jedes gescannte Spiel landet bestätigt bei mir —
 * aus einer Einheit ausgeliehen, von einer anderen Person übernommen oder
 * eine offene Übergabe bestätigt. Die Buchung wählt `scanReceiveGame`.
 */
export function ReceiveSeries({ ref }: { ref: Ref<ScanModeHandle> }) {
  const series = useScanSeries({
    mode: "receive",
    book: async (game) =>
      resultBooking(game, await scanReceiveGame(game.id), ({ outcome }) => ({
        label: RECEIVE_OUTCOME_LABELS[outcome],
        tone: outcome === "already-mine" ? "info" : "success",
        counts: outcome === "already-mine" ? 0 : 1,
      })),
    onOtherScan: (resolved) => ({
      tone: "info",
      text:
        resolved.kind === "unknown"
          ? `Nicht im Bestand: ${resolved.raw}`
          : "Im Modus Erhalten nur Spiele scannen.",
    }),
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
    </ScanSeriesLog>
  );
}

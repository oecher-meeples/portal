"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import {
  markUnitForCompletenessCheck,
  requestCompletenessCheck,
} from "@/lib/ludothek/game-copies";
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
import { spieleCount } from "@/lib/ludothek/scanner-modes";

type UnitPrompt = UnitBulkPrompt & { id: string };

/**
 * Modus „Kontrolle anfordern" (#563, nur `games:manage`): jedes
 * gescannte Spiel wird zur Vollständigkeitskontrolle markiert. Eine
 * gescannte Einheit markiert nach Rückfrage alle Spiele, die direkt in ihr
 * liegen — Unterkisten nicht.
 */
export function MarkSeries({ ref }: { ref: Ref<ScanModeHandle> }) {
  const [unitPrompt, setUnitPrompt] = useState<UnitPrompt | null>(null);
  const series = useScanSeries({
    mode: "mark",
    book: async (game) => {
      const { error, alreadyMarked } = await requestCompletenessCheck(game.id);
      return resultBooking(game, { error, value: alreadyMarked }, (already) =>
        already
          ? { label: "bereits markiert", tone: "info" }
          : { label: "zur Kontrolle markiert", tone: "success", counts: 1 },
      );
    },
    onOtherScan: (resolved) => {
      if (resolved.kind === "unit") {
        if (resolved.contents.length === 0) {
          return { tone: "info", text: `${resolved.unit.label} ist leer.` };
        }
        setUnitPrompt({
          id: resolved.unit.id,
          label: resolved.unit.label,
          count: resolved.contents.length,
        });
        return null;
      }
      return {
        tone: "info",
        text:
          resolved.kind === "unknown"
            ? unknownScanText(resolved)
            : "Hier nur Spiele oder Einheiten scannen.",
      };
    },
  });

  useImperativeHandle(ref, () => ({ handleCode: series.handleCode }));

  async function markUnit(unit: UnitPrompt) {
    const result = await markUnitForCompletenessCheck(unit.id);
    series.log(
      result.error
        ? { tone: "error", text: `${unit.label} – ${result.error}` }
        : {
            tone: "success",
            text: `${unit.label} – ${spieleCount(result.count ?? 0)} markiert`,
            counts: result.count,
          },
    );
  }

  return (
    <ScanSeriesLog
      series={series}
      countLabel={(count) => `${spieleCount(count)} markiert`}
      emptyHint="Noch nichts gescannt."
    >
      <p className="text-muted-foreground text-sm">
        Scanne Spiele, die auf Vollständigkeit geprüft werden sollen — oder eine
        Einheit, um alle Spiele darin zu markieren.
      </p>
      <UnitBulkDialog
        unit={unitPrompt}
        verb="zur Kontrolle anfordern"
        onConfirm={() =>
          unitPrompt ? markUnit(unitPrompt) : Promise.resolve()
        }
        onClose={() => setUnitPrompt(null)}
      />
    </ScanSeriesLog>
  );
}

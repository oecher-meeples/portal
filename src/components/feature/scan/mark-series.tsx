"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  markUnitForCompletenessCheck,
  requestCompletenessCheck,
} from "@/lib/ludothek/game-copies";
import { ScanSeriesLog } from "@/components/feature/scan/scan-series-log";
import {
  resultBooking,
  useScanSeries,
  type ScanModeHandle,
} from "@/components/feature/scan/use-scan-series";
import { spieleCount } from "@/lib/ludothek/scanner-modes";

type UnitPrompt = { id: string; label: string; count: number };

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
            ? `Nicht im Bestand: ${resolved.raw}`
            : "Hier nur Spiele oder Einheiten scannen.",
      };
    },
  });

  useImperativeHandle(ref, () => ({ handleCode: series.handleCode }));

  async function markUnit(unit: UnitPrompt) {
    setUnitPrompt(null);
    const result = await markUnitForCompletenessCheck(unit.id);
    series.log(
      result.error
        ? { tone: "error", text: `${unit.label}: ${result.error}` }
        : {
            tone: "success",
            text: `${unit.label}: ${spieleCount(result.count ?? 0)} markiert`,
            counts: result.count,
          },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Scanne Spiele, die auf Vollständigkeit geprüft werden sollen — oder eine
        Einheit, um alle Spiele darin zu markieren.
      </p>
      {unitPrompt && (
        <div className="bg-primary/10 flex flex-col gap-2 rounded-md p-3 text-sm">
          <p>
            Alle {spieleCount(unitPrompt.count)} in{" "}
            <strong>{unitPrompt.label}</strong> markieren? Spiele in Unterkisten
            bleiben unverändert.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void markUnit(unitPrompt)}>
              Alle markieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnitPrompt(null)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      <ScanSeriesLog
        series={series}
        countLabel={(count) => `${spieleCount(count)} markiert`}
        emptyHint="Noch nichts gescannt."
      />
    </div>
  );
}

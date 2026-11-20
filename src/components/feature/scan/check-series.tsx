"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { PruefbogenPanel } from "@/components/feature/scan/pruefbogen-panel";
import { ScanSeriesLog } from "@/components/feature/scan/scan-series-log";
import {
  gameBooking,
  useScanSeries,
  type ScanModeHandle,
} from "@/components/feature/scan/use-scan-series";
import {
  spieleCount,
  toCopyChoices,
  type CopyChoice,
} from "@/lib/ludothek/scanner-modes";

type UnitList = { label: string; total: number; marked: CopyChoice[] };

/**
 * Modus „Kontrollieren" (#563, früher „Prüfbogen", nur `games:manage`):
 * ein gescanntes Spiel öffnet den Prüfbogen, nach dem Speichern geht es mit
 * dem nächsten Scan weiter. Eine Einheit zeigt ihre markierten Spiele.
 */
export function CheckSeries({ ref }: { ref: Ref<ScanModeHandle> }) {
  const [open, setOpen] = useState<CopyChoice | null>(null);
  const [unitList, setUnitList] = useState<UnitList | null>(null);
  const series = useScanSeries({
    mode: "check",
    book: async (game) => {
      setUnitList(null);
      setOpen(game);
      return null;
    },
    onOtherScan: (resolved) => {
      if (resolved.kind === "unit") {
        setOpen(null);
        setUnitList({
          label: resolved.unit.label,
          total: resolved.contents.length,
          marked: toCopyChoices(
            resolved.contents.filter((copy) => copy.needsCompletenessCheck),
          ),
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

  useImperativeHandle(ref, () => ({
    // Ein offener Prüfbogen wird nicht durch einen weiteren Scan verworfen.
    handleCode: async (raw) => {
      if (open) return;
      await series.handleCode(raw);
    },
  }));

  function finish(game: CopyChoice) {
    setOpen(null);
    setUnitList((list) =>
      list
        ? { ...list, marked: list.marked.filter((g) => g.id !== game.id) }
        : null,
    );
    series.log(
      gameBooking(game, "Prüfbogen gespeichert", {
        tone: "success",
        counts: 1,
      }),
    );
  }

  if (open) {
    return (
      <div className="flex flex-col gap-3">
        {!open.needsCompletenessCheck && (
          <p className="bg-primary/10 rounded-md p-2 text-sm">
            War nicht zur Kontrolle markiert.
          </p>
        )}
        <PruefbogenPanel
          gameCopyId={open.id}
          title={open.title}
          inventoryNumber={open.inventoryNumber}
          onDone={() => finish(open)}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setOpen(null)}
        >
          Abbrechen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Scanne ein Spiel, um es mit dem Prüfbogen zu kontrollieren — oder eine
        Einheit, um ihre markierten Spiele zu sehen.
      </p>
      {unitList && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {unitList.label}: {unitList.marked.length} von {unitList.total} zur
            Kontrolle
          </p>
          {unitList.marked.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setOpen(game)}
            >
              {game.title}
              {game.inventoryNumber
                ? ` · Inv.-Nr. ${game.inventoryNumber}`
                : ""}
            </Button>
          ))}
        </div>
      )}
      <ScanSeriesLog
        series={series}
        countLabel={(count) => `${spieleCount(count)} kontrolliert`}
        emptyHint="Noch nichts kontrolliert."
      />
    </div>
  );
}

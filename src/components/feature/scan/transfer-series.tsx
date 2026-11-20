"use client";

import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { IdCombobox } from "@/components/ui/id-combobox";
import { PillToggle } from "@/components/ui/pill-toggle";
import { MeepleCombobox } from "@/components/entities/meeple-combobox";
import {
  scanEinlagernUnit,
  scanListMeeples,
  scanListUnits,
} from "@/lib/ludothek/holding-actions";
import {
  scanTransferGame,
  scanValidateTarget,
} from "@/lib/ludothek/scanner-actions";
import type { ScannerTarget } from "@/lib/ludothek/scanner-dispatch";
import {
  spieleCount,
  TRANSFER_OUTCOME_LABELS,
} from "@/lib/ludothek/scanner-modes";
import { ScanSeriesLog } from "@/components/feature/scan/scan-series-log";
import {
  resultBooking,
  useScanSeries,
  type ScanModeHandle,
  type SeriesBooking,
} from "@/components/feature/scan/use-scan-series";

type UnitTarget = { kind: "unit"; unitId: string; code: string; label: string };
type MeepleTarget = {
  kind: "meeple";
  meepleId: string;
  displayName: string;
  viaTargetQrScan: boolean;
};
type Target = UnitTarget | MeepleTarget;
type Intent = "handover" | "return";
type UnitOption = { id: string; code: string; label: string };

const INTENT_OPTIONS = [
  { value: "handover" as const, label: "Weitergeben" },
  { value: "return" as const, label: "Zurückgeben" },
];

function toUnitTarget(unit: UnitOption): UnitTarget {
  return { kind: "unit", unitId: unit.id, code: unit.code, label: unit.label };
}

function targetName(target: Target) {
  return target.kind === "unit"
    ? `${target.label} (${target.code})`
    : target.displayName;
}

function sameTarget(a: Target, b: Target) {
  return a.kind === "unit" && b.kind === "unit"
    ? a.unitId === b.unitId
    : a.kind === "meeple" && b.kind === "meeple" && a.meepleId === b.meepleId;
}

function toScannerTarget(target: Target, intent: Intent): ScannerTarget {
  return target.kind === "unit"
    ? { kind: "unit", unitId: target.unitId }
    : {
        kind: "meeple",
        meepleId: target.meepleId,
        intent,
        viaTargetQrScan: target.viaTargetQrScan,
      };
}

const info = (text: string): SeriesBooking => ({ tone: "info", text });

/**
 * Modus „Übergeben" (#539): erst das Ziel (Einheiten-Etikett, persönlicher
 * Meeple-QR oder manuelle Wahl), dann beliebig viele Spiele. Die Buchung
 * wählt `scanTransferGame` (Rückgabe/Umlagern in die Einheit bzw.
 * Weitergabe/Rückgabe an die Person). Ein neues Ziel während der Serie wird
 * erst nach Rückfrage übernommen — dort lässt sich auch eine Einheit in die
 * Ziel-Einheit einlagern (löst die frühere Einlagern-Serie ab).
 */
export function TransferSeries({
  ref,
  initialUnitId = null,
}: {
  ref: Ref<ScanModeHandle>;
  /** `?ziel=<unitId>` — belegt das Einheiten-Ziel vor. */
  initialUnitId?: string | null;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [intent, setIntent] = useState<Intent>("handover");
  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [units, setUnits] = useState<UnitOption[] | null>(null);
  const [meeples, setMeeples] = useState<
    { id: string; displayName: string }[] | null
  >(null);

  const series = useScanSeries({
    mode: "transfer",
    target: target ? toScannerTarget(target, intent) : null,
    book: async (game) => {
      if (!target) return info("Erst Ziel scannen oder wählen.");
      const result = await scanTransferGame(
        game.id,
        toScannerTarget(target, intent),
      );
      return resultBooking(game, result, ({ outcome, confirmed }) => {
        const verb = TRANSFER_OUTCOME_LABELS[outcome];
        if (outcome === "already-there") return { label: verb, tone: "info" };
        const status =
          target.kind === "meeple"
            ? confirmed
              ? " — bestätigt"
              : ` — unbestätigt, wartet auf ${target.displayName}`
            : "";
        return {
          label: `${verb} → ${targetName(target)}${status}`,
          tone: "success",
          counts: 1,
        };
      });
    },
    onOtherScan: async (resolved) => {
      if (resolved.kind === "unknown") {
        return info(`Nicht im Bestand: ${resolved.raw}`);
      }
      const next: Target =
        resolved.kind === "unit"
          ? toUnitTarget(resolved.unit)
          : {
              kind: "meeple",
              meepleId: resolved.meeple.id,
              displayName: resolved.meeple.displayName,
              viaTargetQrScan: true,
            };
      if (!target) return chooseTarget(next);
      if (sameTarget(target, next)) return info("Das ist bereits das Ziel.");
      setPendingTarget(next);
      return null;
    },
  });

  useImperativeHandle(ref, () => ({ handleCode: series.handleCode }));

  useEffect(() => {
    if (!initialUnitId) return;
    let cancelled = false;
    scanListUnits().then((list) => {
      if (cancelled) return;
      setUnits(list);
      const unit = list.find((option) => option.id === initialUnitId);
      if (unit) setTarget(toUnitTarget(unit));
    });
    return () => {
      cancelled = true;
    };
  }, [initialUnitId]);

  /** Setzt ein Ziel — eine Person erst nach `scanValidateTarget`. */
  async function chooseTarget(next: Target): Promise<SeriesBooking | null> {
    setPendingTarget(null);
    if (next.kind === "meeple") {
      const result = await scanValidateTarget(next.meepleId);
      if (result.error) return { tone: "error", text: result.error };
    }
    setTarget(next);
    return null;
  }

  async function applyTarget(next: Target) {
    const problem = await chooseTarget(next);
    if (problem) series.log(problem);
  }

  async function einlagern(unit: UnitTarget, into: UnitTarget) {
    setPendingTarget(null);
    const result = await scanEinlagernUnit(unit.unitId, {
      parentUnitId: into.unitId,
    });
    series.log(
      result.error
        ? { tone: "error", text: `${targetName(unit)}: ${result.error}` }
        : {
            tone: "success",
            text: `Einheit ${targetName(unit)} → ${targetName(into)} eingelagert`,
          },
    );
  }

  async function loadPickers() {
    const [unitList, meepleList] = await Promise.all([
      units ?? scanListUnits(),
      meeples ?? scanListMeeples(),
    ]);
    setUnits(unitList);
    setMeeples(meepleList);
  }

  return (
    <div className="flex flex-col gap-3">
      {target ? (
        <div className="bg-primary/10 flex flex-wrap items-center justify-between gap-2 rounded-md p-3 text-sm">
          <span>
            Ziel: <strong>{targetName(target)}</strong>
          </span>
          <Button size="sm" variant="outline" onClick={() => setTarget(null)}>
            Ziel ändern
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            Scanne zuerst das Ziel — ein Einheiten-Etikett oder den persönlichen
            QR-Code einer Person — oder wähle es aus.
          </p>
          {units && meeples ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <MeepleCombobox
                options={meeples}
                value={null}
                placeholder="Person wählen …"
                onValueChange={(meepleId) => {
                  const meeple = meeples.find((m) => m.id === meepleId);
                  if (meeple) {
                    void applyTarget({
                      kind: "meeple",
                      meepleId: meeple.id,
                      displayName: meeple.displayName,
                      viaTargetQrScan: false,
                    });
                  }
                }}
              />
              <IdCombobox
                options={units.map((unit) => ({
                  id: unit.id,
                  label: `${unit.label} (${unit.code})`,
                }))}
                value={null}
                placeholder="Einheit wählen …"
                onValueChange={(unitId) => {
                  const unit = units.find((u) => u.id === unitId);
                  if (unit) void applyTarget(toUnitTarget(unit));
                }}
              />
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => void loadPickers()}
            >
              Ziel manuell wählen
            </Button>
          )}
        </div>
      )}

      {target?.kind === "meeple" && (
        <PillToggle
          options={INTENT_OPTIONS}
          value={intent}
          onChange={setIntent}
        />
      )}

      {pendingTarget && target && (
        <div className="bg-muted/60 flex flex-col gap-2 rounded-md border p-3 text-sm">
          <p>
            <strong>{targetName(pendingTarget)}</strong> gescannt — aktuelles
            Ziel ist <strong>{targetName(target)}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void applyTarget(pendingTarget)}>
              Ziel wechseln
            </Button>
            {pendingTarget.kind === "unit" && target.kind === "unit" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void einlagern(pendingTarget, target)}
              >
                {pendingTarget.code} in {target.code} einlagern
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingTarget(null)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      <ScanSeriesLog
        series={series}
        countLabel={(count) => `${spieleCount(count)} übergeben`}
        emptyHint={target ? "Jetzt Spiele scannen." : "Noch kein Ziel."}
      />
    </div>
  );
}

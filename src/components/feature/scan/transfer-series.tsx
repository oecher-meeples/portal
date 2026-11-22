"use client";

import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { IdCombobox } from "@/components/ui/id-combobox";
import { PillToggle } from "@/components/ui/pill-toggle";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/field";
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
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple-name";
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
/** #540: Weitergabe an das Sammelkonto „Anonymer Meeple" mit Namen. */
type ExternalTarget = { kind: "external"; externalName: string };
type Target = UnitTarget | MeepleTarget | ExternalTarget;
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
  if (target.kind === "unit") return `${target.label} (${target.code})`;
  if (target.kind === "external") {
    return `${ANONYMER_MEEPLE_NAME} (${target.externalName})`;
  }
  return target.displayName;
}

function sameTarget(a: Target, b: Target) {
  if (a.kind === "unit" && b.kind === "unit") return a.unitId === b.unitId;
  return (
    a.kind === "meeple" && b.kind === "meeple" && a.meepleId === b.meepleId
  );
}

function toScannerTarget(target: Target, intent: Intent): ScannerTarget {
  if (target.kind === "unit") return { kind: "unit", unitId: target.unitId };
  if (target.kind === "external") return target;
  return {
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
  const [externalName, setExternalName] = useState("");
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
        ? { tone: "error", text: `${targetName(unit)} – ${result.error}` }
        : {
            tone: "success",
            text: `Einheit ${targetName(unit)} → ${targetName(into)} eingelagert`,
          },
    );
  }

  /** #540: Name geändert — leer schaltet den Umschalter samt Ziel ab. */
  function changeExternalName(name: string) {
    setExternalName(name);
    if (target?.kind !== "external") return;
    setTarget(
      name.trim() ? { kind: "external", externalName: name.trim() } : null,
    );
  }

  function toggleExternal(on: boolean) {
    setPendingTarget(null);
    setTarget(
      on ? { kind: "external", externalName: externalName.trim() } : null,
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
    <ScanSeriesLog
      series={series}
      countLabel={(count) => `${spieleCount(count)} übergeben`}
      emptyHint={target ? "Jetzt Spiele scannen." : "Noch kein Ziel."}
    >
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

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <TextField
          id="external-name"
          label="Name der externen Person"
          hint="Wird für den Spielewart gespeichert, damit er das Spiel später umbuchen kann."
          value={externalName}
          onChange={(event) => changeExternalName(event.target.value)}
        />
        <Label htmlFor="external-toggle" className="font-normal">
          <Switch
            id="external-toggle"
            checked={target?.kind === "external"}
            disabled={!externalName.trim()}
            onCheckedChange={toggleExternal}
          />
          An {ANONYMER_MEEPLE_NAME} weitergeben
        </Label>
      </div>

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
    </ScanSeriesLog>
  );
}

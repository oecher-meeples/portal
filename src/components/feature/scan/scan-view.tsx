"use client";

import { Card } from "@/components/ui/card";
import { useRef, useState } from "react";
import { Camera, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/pill-toggle";
import { CodeScanner } from "@/components/ui/code-scanner";
import { PageContainer } from "@/components/ui/page-container";
import { useFocusMode } from "@/components/ui/use-focus-mode";
import { CheckSeries } from "@/components/feature/scan/check-series";
import { MarkSeries } from "@/components/feature/scan/mark-series";
import { ReceiveSeries } from "@/components/feature/scan/receive-series";
import { SingleScan } from "@/components/feature/scan/single-scan";
import { TransferSeries } from "@/components/feature/scan/transfer-series";
import type { ScanModeHandle } from "@/components/feature/scan/use-scan-series";
import {
  SCANNER_PAGE_MODE_LABELS,
  scannerModeHref,
  scannerModesFor,
  type ScannerPageMode,
} from "@/lib/ludothek/scanner-modes";

/**
 * Rahmen der Scanner-Seite (#538): Moduswahl (in der URL, `?modus=`),
 * Kamera und manuelle Eingabe. Jeder erkannte Code geht über eine Ref an den
 * aktiven Modus — die Kamera hält ihren `onDetected`-Callback ab dem Start
 * fest, die Ref sorgt dafür, dass ein Moduswechsel trotzdem greift.
 */
export function ScanView({
  canManageGames,
  initialMode,
  initialTargetUnitId = null,
}: {
  canManageGames: boolean;
  initialMode: ScannerPageMode;
  /** `?ziel=<unitId>` im Modus „Übergeben" (#539). */
  initialTargetUnitId?: string | null;
}) {
  const [mode, setMode] = useState(initialMode);
  const [targetUnitId, setTargetUnitId] = useState(initialTargetUnitId);
  const [manualInput, setManualInput] = useState("");
  const [lastRaw, setLastRaw] = useState("");
  // #573: Im Einzel-Scan ersetzt das Ergebnis die Kamera, bis
  // „Nächster Scan“ sie wieder einblendet (Unmount stoppt den Stream).
  const [cameraPaused, setCameraPaused] = useState(false);
  const showCamera = mode !== "einzel" || !cameraPaused;
  // Die Kamera hält `handleCode` ab dem Start fest — der Modus kommt daher
  // aus einer Ref, nicht aus der Closure.
  const currentModeRef = useRef(mode);
  const modeRef = useRef<ScanModeHandle>(null);
  const focusMode = useFocusMode();

  function changeMode(next: ScannerPageMode, ziel: string | null = null) {
    setMode(next);
    currentModeRef.current = next;
    setTargetUnitId(ziel);
    setCameraPaused(false);
    // Ohne Server-Roundtrip — die Kamera läuft weiter (Next.js integriert
    // `replaceState` in den Router).
    window.history.replaceState(null, "", scannerModeHref(next, ziel));
  }

  async function handleCode(raw: string) {
    setLastRaw(raw);
    if (currentModeRef.current === "einzel") setCameraPaused(true);
    await modeRef.current?.handleCode(raw);
  }

  return (
    <PageContainer className="gap-6">
      {/* #587: Zeile sticky — normal unter dem fixen Header, im Fokusmodus
          (Header ausgeblendet) am oberen Rand. Bei 5 Modi (Admin) dürfen die
          Pills umbrechen, das Icon bleibt rechts. */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 focus-mode:top-0 sticky top-16 z-20 -my-2 flex items-start justify-between gap-2 py-2 backdrop-blur md:static md:my-0 md:bg-transparent md:py-0 md:backdrop-blur-none">
        <div className="min-w-0 flex-1">
          <PillToggle
            options={scannerModesFor(canManageGames).map((value) => ({
              value,
              label: SCANNER_PAGE_MODE_LABELS[value],
            }))}
            value={mode}
            onChange={(next) => changeMode(next)}
          />
        </div>
        {focusMode.available && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={
              focusMode.active ? "Fokusmodus beenden" : "Fokusmodus starten"
            }
            aria-pressed={focusMode.active}
            onClick={focusMode.toggle}
          >
            {focusMode.active ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        )}
      </div>

      <div
        className={
          showCamera ? "grid gap-6 lg:grid-cols-[2fr_1fr]" : "grid gap-4"
        }
      >
        {showCamera ? (
          <CodeScanner onDetected={handleCode} />
        ) : (
          <Button
            size="lg"
            className="w-full sm:w-fit"
            onClick={() => setCameraPaused(false)}
          >
            <Camera className="size-4" />
            Nächster Scan
          </Button>
        )}

        <Card className="gap-4">
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (manualInput.trim()) void handleCode(manualInput.trim());
            }}
          >
            <label htmlFor="manual-code" className="text-sm font-medium">
              Manuelle Eingabe
            </label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="inv-123, OM-BOX-0001 oder EAN"
              />
              <Button type="submit">Suchen</Button>
            </div>
          </form>

          <div className="border-t pt-4">
            {mode === "erhalten" && <ReceiveSeries ref={modeRef} />}
            {mode === "uebergeben" && (
              <TransferSeries
                key={targetUnitId ?? ""}
                ref={modeRef}
                initialUnitId={targetUnitId}
              />
            )}
            {mode === "markieren" && <MarkSeries ref={modeRef} />}
            {mode === "kontrollieren" && <CheckSeries ref={modeRef} />}
            {mode === "einzel" && (
              <SingleScan
                ref={modeRef}
                canManageGames={canManageGames}
                onFillUnit={(unitId) => changeMode("uebergeben", unitId)}
              />
            )}
          </div>
        </Card>
      </div>

      {lastRaw && (
        <p className="text-muted-foreground text-xs">
          Zuletzt gescannt: <span className="font-mono">{lastRaw}</span>
        </p>
      )}
    </PageContainer>
  );
}

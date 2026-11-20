"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/pill-toggle";
import { CodeScanner } from "@/components/ui/code-scanner";
import { PageContainer } from "@/components/ui/page-container";
import { CheckSeries } from "@/components/feature/scan/check-series";
import { MarkSeries } from "@/components/feature/scan/mark-series";
import { ReceiveSeries } from "@/components/feature/scan/receive-series";
import { SingleScan } from "@/components/feature/scan/single-scan";
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
}: {
  canManageGames: boolean;
  initialMode: ScannerPageMode;
}) {
  const [mode, setMode] = useState(initialMode);
  const [manualInput, setManualInput] = useState("");
  const [lastRaw, setLastRaw] = useState("");
  const modeRef = useRef<ScanModeHandle>(null);

  function changeMode(next: ScannerPageMode) {
    setMode(next);
    // Ohne Server-Roundtrip — die Kamera läuft weiter (Next.js integriert
    // `replaceState` in den Router).
    window.history.replaceState(null, "", scannerModeHref(next));
  }

  async function handleCode(raw: string) {
    setLastRaw(raw);
    await modeRef.current?.handleCode(raw);
  }

  return (
    <PageContainer className="gap-6">
      <PillToggle
        options={scannerModesFor(canManageGames).map((value) => ({
          value,
          label: SCANNER_PAGE_MODE_LABELS[value],
        }))}
        value={mode}
        onChange={changeMode}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CodeScanner onDetected={handleCode} />

        <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
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
            {mode === "markieren" && <MarkSeries ref={modeRef} />}
            {mode === "kontrollieren" && <CheckSeries ref={modeRef} />}
            {mode === "einzel" && (
              <SingleScan ref={modeRef} canManageGames={canManageGames} />
            )}
          </div>
        </div>
      </div>

      {lastRaw && (
        <p className="text-muted-foreground text-xs">
          Zuletzt gescannt: <span className="font-mono">{lastRaw}</span>
        </p>
      )}
    </PageContainer>
  );
}

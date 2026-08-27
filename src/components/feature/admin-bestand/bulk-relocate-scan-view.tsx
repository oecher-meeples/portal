"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodeScanner } from "@/components/ui/code-scanner";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { bulkRelocateGameCopy } from "@/lib/ludothek/bulk-relocate";

/**
 * Sammel-Umlagern-Scan-Ansicht (#273): Ziel-Einheit steht bereits fest
 * (`targetUnitId`), danach Loop aus Exemplar-Scan → Umlagern — gemeinsam
 * genutzt von Event-Ausgabe, Event-Rückgabe und der Regal-unter-Event-
 * Zuordnung (Stufe 2). Ein EAN-Treffer kann mehrere Exemplare desselben
 * Titels liefern (ADR 0001/0008) — alle werden auf dieselbe Ziel-Einheit
 * gebucht.
 */
export function BulkRelocateScanView({
  targetUnitId,
  targetLabel,
}: {
  targetUnitId: string;
  targetLabel: string;
}) {
  const [manualInput, setManualInput] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleScan(raw: string) {
    setBusy(true);
    const resolved = await scanResolveCode(raw);

    if (resolved.kind === "unknown") {
      setLog((entries) => [`„${raw}“ nicht im Bestand gefunden.`, ...entries]);
      setBusy(false);
      return;
    }
    if (resolved.kind === "unit") {
      setLog((entries) => [
        `„${raw}“ ist eine Lagereinheit, kein Exemplar — bitte ein Spiel scannen.`,
        ...entries,
      ]);
      setBusy(false);
      return;
    }

    for (const game of resolved.games) {
      const result = await bulkRelocateGameCopy(game.id, targetUnitId);
      setLog((entries) => [
        result.error
          ? `${game.boardGame.title}: ${result.error}`
          : `${game.boardGame.title} → ${targetLabel}`,
        ...entries,
      ]);
    }
    setBusy(false);
  }

  async function handleManualSubmit() {
    const raw = manualInput.trim();
    if (!raw) return;
    setManualInput("");
    await handleScan(raw);
  }

  return (
    <div className="flex flex-col gap-4">
      <CodeScanner onDetected={handleScan} />
      <div className="flex gap-2">
        <Input
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          placeholder="Code manuell eingeben"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleManualSubmit();
          }}
        />
        <Button
          variant="outline"
          disabled={busy || !manualInput.trim()}
          onClick={handleManualSubmit}
        >
          Erfassen
        </Button>
      </div>

      {log.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {log.map((entry, index) => (
            <li key={index} className="text-muted-foreground">
              {entry}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

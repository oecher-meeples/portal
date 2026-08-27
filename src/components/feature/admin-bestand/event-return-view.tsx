"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodeScanner } from "@/components/ui/code-scanner";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { BulkRelocateScanView } from "@/components/feature/admin-bestand/bulk-relocate-scan-view";

/**
 * Event-Rückgabe (#273): Ziel-Lagereinheit einmal scannen/eingeben, danach
 * derselbe Sammel-Umlagern-Baustein wie bei der Event-Ausgabe — jedes
 * gescannte Exemplar wandert weg vom Event-Standort (oder dem Regal
 * darunter) auf diese Ziel-Einheit.
 */
export function EventReturnView() {
  const [target, setTarget] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function resolveTarget(raw: string) {
    setError(null);
    const resolved = await scanResolveCode(raw);
    if (resolved.kind !== "unit") {
      setError(`„${raw}“ ist keine Lagereinheit.`);
      return;
    }
    setTarget({ id: resolved.unit.id, label: resolved.unit.label });
  }

  async function handleManualSubmit() {
    const raw = manualInput.trim();
    if (!raw) return;
    setManualInput("");
    await resolveTarget(raw);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Bestand & Inventur"
        title="Event-Rückgabe"
        description="Ziel-Lagereinheit wählen, dann jedes zurückkommende Spiel scannen."
      />

      {!target ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Ziel-Lagereinheit scannen oder Code eingeben.
          </p>
          <CodeScanner onDetected={resolveTarget} />
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="Einheiten-Code, z. B. OM-SHELF-0002"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleManualSubmit();
              }}
            />
            <Button
              variant="outline"
              disabled={!manualInput.trim()}
              onClick={handleManualSubmit}
            >
              Erfassen
            </Button>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Ziel: {target.label}</p>
            <Button size="sm" variant="ghost" onClick={() => setTarget(null)}>
              Ändern
            </Button>
          </div>
          <BulkRelocateScanView
            targetUnitId={target.id}
            targetLabel={target.label}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodeScanner } from "@/components/ui/code-scanner";
import { scanResolveCode } from "@/lib/ludothek/holding-actions";
import { setUnitParent } from "@/lib/ludothek/storage-units";

/**
 * Stufe 2 (#273): sobald vor Ort die Regale aufgebaut sind, werden ihre
 * physischen `StorageUnit`s per Scan unter die Event-Unit gehängt — kein
 * neuer Mechanismus, nur `setUnitParent()` (`moveStorageUnit()` mit
 * Zyklen-Prüfung, identisch zur manuellen Standort-Zuordnung in
 * `/admin/einheiten`).
 */
export function AssignShelfToEventView({
  eventUnitId,
}: {
  eventUnitId: string;
}) {
  const [manualInput, setManualInput] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleScan(raw: string) {
    setBusy(true);
    const resolved = await scanResolveCode(raw);

    if (resolved.kind !== "unit") {
      setLog((entries) => [
        `„${raw}“ ist keine Lagereinheit — bitte den Regal-Code scannen.`,
        ...entries,
      ]);
      setBusy(false);
      return;
    }

    const result = await setUnitParent(resolved.unit.id, eventUnitId);
    setLog((entries) => [
      result.error
        ? `${resolved.unit.label}: ${result.error}`
        : `${resolved.unit.label} unter Event eingehängt.`,
      ...entries,
    ]);
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
      <p className="text-muted-foreground text-sm">
        Regal-Code scannen, um es für die Dauer des Events unter den
        Event-Standort zu hängen.
      </p>
      <CodeScanner onDetected={handleScan} />
      <div className="flex gap-2">
        <Input
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          placeholder="Regal-Code manuell eingeben"
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

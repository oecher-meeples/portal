"use client";

import { useState } from "react";
import { IdCombobox } from "@/components/ui/id-combobox";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { parseScannedCode } from "@/lib/inventory/codes";

/** Ein wählbares Ziel. Gegen `matchValue` wird ein gescannter Text
 * abgeglichen (Einheiten: der Code, Personen: der Anzeigename). */
export type HoldingTarget = { id: string; label: string; matchValue: string };

export function meepleTargets(
  meeples: { id: string; displayName: string }[],
): HoldingTarget[] {
  return meeples.map((m) => ({
    id: m.id,
    label: m.displayName,
    matchValue: m.displayName,
  }));
}

export function unitTargets(
  units: { id: string; code: string; label: string }[],
): HoldingTarget[] {
  return units.map((u) => ({
    id: u.id,
    label: `${u.label} (${u.code})`,
    matchValue: u.code,
  }));
}

/** Wie ein Ziel gewählt wurde. `meeple-qr` ist der persönliche QR-Code des
 * Ziel-Meeples (#465). Den Code hat die Person dann selbst vorgezeigt, die
 * Buchung gilt deshalb sofort als bestätigt. */
export type TargetPickSource = "input" | "scan" | "meeple-qr";

/**
 * Gescannten Text einem Ziel zuordnen. Meeple-QR matcht per Id, ein
 * Einheiten-Etikett (Short-ID-URL oder `OM-BOX-…`, #547) exakt per Code.
 * Freitext matcht exakt oder, falls das nicht klappt, als eindeutiger
 * Teiltreffer. Weil ein Scan im Panel die Buchung sofort auslöst (#573),
 * gilt ein mehrdeutiger Teiltreffer als „kein Ziel“.
 */
export function matchScannedTarget(
  targets: HoldingTarget[],
  text: string,
): { id: string; source: TargetPickSource } | null {
  const parsed = parseScannedCode(text);
  if (parsed.kind === "meeple") {
    const match = targets.find((target) => target.id === parsed.value);
    return match ? { id: match.id, source: "meeple-qr" } : null;
  }

  const needle = (parsed.kind === "unit" ? parsed.value : text)
    .trim()
    .toLowerCase();
  if (!needle) return null;
  const exact = targets.find(
    (target) => target.matchValue.toLowerCase() === needle,
  );
  if (exact) return { id: exact.id, source: "scan" };
  if (parsed.kind === "unit") return null;

  const partial = targets.filter((target) =>
    target.matchValue.toLowerCase().includes(needle),
  );
  return partial.length === 1 ? { id: partial[0].id, source: "scan" } : null;
}

/**
 * Ziel-Picker für Weitergeben, Rückgabe an Person und Umlagern (#573),
 * gemeinsam für `GameHoldingPanel` und die Mini-Dialoge. Er besteht aus einer
 * durchsuchbaren Auswahl (Enter übernimmt den ersten Treffer) und einem
 * Scan-Button. Ob eine Wahl die Aktion sofort auslöst (Panel) oder nur
 * vormerkt (Dialog mit Absende-Button), entscheidet der Aufrufer in `onPick`.
 */
export function HoldingTargetPicker({
  targets,
  value,
  onPick,
  placeholder = "Ziel suchen …",
}: {
  targets: HoldingTarget[];
  value: string | null;
  /** `null`, wenn das Eingabefeld geleert wurde. */
  onPick: (id: string | null, source: TargetPickSource) => void;
  placeholder?: string;
}) {
  const [scanError, setScanError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <IdCombobox
            options={targets.map(({ id, label }) => ({ id, label }))}
            value={value}
            onValueChange={(id) => {
              setScanError(null);
              onPick(id, "input");
            }}
            placeholder={placeholder}
          />
        </div>
        <ScanSearchDialog
          onScanned={(text) => {
            const match = matchScannedTarget(targets, text);
            setScanError(match ? null : "Kein passendes Ziel erkannt.");
            if (match) onPick(match.id, match.source);
          }}
        />
      </div>
      {scanError && <p className="text-destructive text-sm">{scanError}</p>}
    </div>
  );
}

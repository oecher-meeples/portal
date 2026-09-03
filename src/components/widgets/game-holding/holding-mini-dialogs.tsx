"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { parseScannedCode } from "@/lib/inventory/codes";
import { cn } from "@/lib/utils/cn";
import {
  scanAcceptReturn,
  scanBorrowGame,
  scanGiveToMeeple,
  scanListMeeples,
  scanListUnits,
  scanRelocateGame,
  scanReturnToMeeple,
} from "@/lib/ludothek/holding-actions";

const TRIGGER_CLASS = "w-full justify-start";

/** Every mini-dialog below can also run fully controlled (Plan-Schritt 12) —
 * opened programmatically right after a Exemplar-Auswahl-Popup instead of by
 * its own trigger click. Omit both for the normal, self-triggered dialog. */
type ControlledDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Trigger-Button-Klasse überschreiben — Default `TRIGGER_CLASS` passt zur
 * vollen Zeilenbreite einer Dropdown-Menu-Zeile (`game-actions-menu.tsx`);
 * ein Aufrufer außerhalb dieses Kontexts (z. B. `vereinsspiele-section.tsx`,
 * mehrere Trigger nebeneinander in einer `flex`-Zeile) übergibt hier eine
 * schmalere Klasse, statt `w-full` in eine Row zu zwingen. */
type TriggerClassNameProp = { triggerClassName?: string };

/** Trigger-Button-Variante überschreiben (#455) — Default `ghost` passt zum
 * Dropdown-Menü-Kontext (`game-actions-menu.tsx`), wirkt aber freistehend
 * (z. B. `vereinsspiele-section.tsx`) ohne Rand/Füllung nicht als Button
 * erkennbar. Aufrufer außerhalb eines Menüs übergeben hier `"outline"`. */
type TriggerVariantProp = {
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
};

/** Ausleihen — always self, no target to pick (see holding-actions.ts). */
export function BorrowGameDialog({
  gameCopyId,
  open,
  onOpenChange,
}: { gameCopyId: string } & ControlledDialogProps) {
  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
            Ausleihen
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Spiel ausleihen"
      description="Du buchst das Exemplar auf dich selbst aus."
      submitLabel="Ausleihen"
      action={() => scanBorrowGame(gameCopyId)}
    />
  );
}

type Target = { id: string; label: string; matchValue: string };

/** Select-or-scan target picker, shared by Rückgabe/Weitergeben/Umlagern —
 * the scan text is matched against `matchValue` (e.g. unit code), fachfrei
 * per `ScanSearchDialog`'s own contract. Erkennt zusätzlich den
 * persönlichen QR-Code eines Meeples (#465, `OM-MEEPLE-<id>`) und matcht
 * dann direkt per Id statt per Freitext — der zweite `onSelect`-Parameter
 * markiert diesen Fall, relevant nur für Rückgabe/Weitergeben (Umlagern hat
 * Einheiten als Ziel, ein Meeple-Code matcht dort ohnehin nie). */
function TargetPicker({
  targets,
  selected,
  onSelect,
}: {
  targets: Target[];
  selected: string;
  onSelect: (id: string, viaMeepleQrScan?: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(event) => onSelect(event.target.value, false)}
        className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
      >
        <option value="">— Ziel wählen —</option>
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.label}
          </option>
        ))}
      </select>
      <ScanSearchDialog
        onScanned={(text) => {
          const parsed = parseScannedCode(text);
          if (parsed.kind === "meeple") {
            const match = targets.find((target) => target.id === parsed.value);
            if (match) onSelect(match.id, true);
            return;
          }
          const needle = text.trim().toLowerCase();
          const match = targets.find((target) =>
            target.matchValue.toLowerCase().includes(needle),
          );
          if (match) onSelect(match.id, false);
        }}
      />
    </div>
  );
}

type ReturnMode = "self" | "person";

/** Rückgabe — ein Dialog mit Umschalter statt zweier Menüpunkte (Plan-Schritt
 * 7): "an mich" bleibt der bisherige `scanAcceptReturn` (abgeschlossen erst
 * durchs Einlagern), "an Person" sucht die annehmende Person per
 * `TargetPicker` und ruft `scanReturnToMeeple`. */
export function AcceptReturnDialog({
  gameCopyId,
  open,
  onOpenChange,
  triggerClassName,
  triggerVariant = "ghost",
  hideSelfMode,
}: { gameCopyId: string; hideSelfMode?: boolean } & ControlledDialogProps &
  TriggerClassNameProp &
  TriggerVariantProp) {
  const initialMode: ReturnMode = hideSelfMode ? "person" : "self";
  const [mode, setMode] = useState<ReturnMode>(initialMode);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");
  // #465: true, sobald das Ziel per persönlichem QR-Code der Person selbst
  // aufgelöst wurde — löst dann Sofort-Bestätigung statt "unbestätigt" aus.
  const [viaMeepleQrScan, setViaMeepleQrScan] = useState(false);

  async function loadTargets() {
    if (targets.length > 0) return;
    const meeples = await scanListMeeples();
    setTargets(
      meeples.map((m) => ({
        id: m.id,
        label: m.displayName,
        matchValue: m.displayName,
      })),
    );
  }

  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button
            variant={triggerVariant}
            size="sm"
            className={cn(TRIGGER_CLASS, triggerClassName)}
          >
            Rückgabe
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Rückgabe"
      description={
        mode === "self"
          ? "Du nimmst das Exemplar zur Rückgabe an — eingelagert werden muss es noch separat."
          : "Die ausgewählte Person nimmt das Exemplar zur Rückgabe an."
      }
      submitLabel={mode === "self" ? "Annehmen" : "An Person übergeben"}
      canSubmit={mode === "self" || selected !== ""}
      action={() =>
        mode === "self"
          ? scanAcceptReturn(gameCopyId)
          : scanReturnToMeeple(gameCopyId, selected, viaMeepleQrScan)
      }
      onOpen={hideSelfMode ? loadTargets : undefined}
      onReset={() => {
        setMode(initialMode);
        setSelected("");
        setViaMeepleQrScan(false);
      }}
    >
      <div className="flex flex-col gap-3">
        {!hideSelfMode && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "self" ? "default" : "outline"}
              className={cn(mode === "self" && "pointer-events-none")}
              onClick={() => setMode("self")}
            >
              An mich
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "person" ? "default" : "outline"}
              className={cn(mode === "person" && "pointer-events-none")}
              onClick={() => {
                setMode("person");
                loadTargets();
              }}
            >
              An Person
            </Button>
          </div>
        )}
        {mode === "person" && (
          <TargetPicker
            targets={targets}
            selected={selected}
            onSelect={(id, viaQrScan) => {
              setSelected(id);
              setViaMeepleQrScan(viaQrScan ?? false);
            }}
          />
        )}
      </div>
    </ActionDialog>
  );
}

/** Weitergeben — die abgebende Person wählt die empfangende, bestätigt ist
 * die Weitergabe erst durch deren eigenen Klick (siehe scanGiveToMeeple). */
export function GiveToMeepleDialog({
  gameCopyId,
  open,
  onOpenChange,
  triggerClassName,
  triggerVariant = "ghost",
}: { gameCopyId: string } & ControlledDialogProps &
  TriggerClassNameProp &
  TriggerVariantProp) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");
  // #465: siehe AcceptReturnDialog — QR-Scan des Ziel-Meeples bestätigt sofort.
  const [viaMeepleQrScan, setViaMeepleQrScan] = useState(false);

  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button
            variant={triggerVariant}
            size="sm"
            className={cn(TRIGGER_CLASS, triggerClassName)}
          >
            Weitergeben
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Weitergeben"
      description={
        viaMeepleQrScan
          ? "Ziel per persönlichem QR-Code bestätigt — die Weitergabe gilt sofort als abgeschlossen."
          : "Bestätigt ist die Weitergabe erst durch den Klick der empfangenden Person."
      }
      submitLabel="Weitergeben"
      canSubmit={selected !== ""}
      onOpen={async () => {
        const meeples = await scanListMeeples();
        setTargets(
          meeples.map((m) => ({
            id: m.id,
            label: m.displayName,
            matchValue: m.displayName,
          })),
        );
      }}
      action={() => scanGiveToMeeple(gameCopyId, selected, viaMeepleQrScan)}
      onReset={() => {
        setSelected("");
        setViaMeepleQrScan(false);
      }}
    >
      <TargetPicker
        targets={targets}
        selected={selected}
        onSelect={(id, viaQrScan) => {
          setSelected(id);
          setViaMeepleQrScan(viaQrScan ?? false);
        }}
      />
    </ActionDialog>
  );
}

/** Umlagern — Zieleinheit per Auswahl oder Scan des Einheiten-Codes. */
export function RelocateGameDialog({
  gameCopyId,
  open,
  onOpenChange,
}: { gameCopyId: string } & ControlledDialogProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");

  return (
    <ActionDialog
      trigger={
        open === undefined ? (
          <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
            Umlagern
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Umlagern"
      description="Wähle die Ziel-Einheit."
      submitLabel="Umlagern"
      canSubmit={selected !== ""}
      onOpen={async () => {
        const units = await scanListUnits();
        setTargets(
          units.map((u) => ({
            id: u.id,
            label: `${u.label} (${u.code})`,
            matchValue: u.code,
          })),
        );
      }}
      action={() => scanRelocateGame(gameCopyId, selected)}
      onReset={() => setSelected("")}
    >
      <TargetPicker
        targets={targets}
        selected={selected}
        onSelect={setSelected}
      />
    </ActionDialog>
  );
}

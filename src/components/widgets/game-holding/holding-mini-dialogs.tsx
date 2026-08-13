"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
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

/** Ausleihen — always self, no target to pick (see holding-actions.ts). */
export function BorrowGameDialog({ gameCopyId }: { gameCopyId: string }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
          Ausleihen
        </Button>
      }
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
 * per `ScanSearchDialog`'s own contract. */
function TargetPicker({
  targets,
  selected,
  onSelect,
}: {
  targets: Target[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(event) => onSelect(event.target.value)}
        className="border-input h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
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
          const needle = text.trim().toLowerCase();
          const match = targets.find((target) =>
            target.matchValue.toLowerCase().includes(needle),
          );
          if (match) onSelect(match.id);
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
export function AcceptReturnDialog({ gameCopyId }: { gameCopyId: string }) {
  const [mode, setMode] = useState<ReturnMode>("self");
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");

  async function switchToPersonMode() {
    setMode("person");
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
        <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
          Rückgabe
        </Button>
      }
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
          : scanReturnToMeeple(gameCopyId, selected)
      }
      onReset={() => {
        setMode("self");
        setSelected("");
      }}
    >
      <div className="flex flex-col gap-3">
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
            onClick={switchToPersonMode}
          >
            An Person
          </Button>
        </div>
        {mode === "person" && (
          <TargetPicker
            targets={targets}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </div>
    </ActionDialog>
  );
}

/** Weitergeben — die abgebende Person wählt die empfangende, bestätigt ist
 * die Weitergabe erst durch deren eigenen Klick (siehe scanGiveToMeeple). */
export function GiveToMeepleDialog({ gameCopyId }: { gameCopyId: string }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
          Weitergeben
        </Button>
      }
      title="Weitergeben"
      description="Bestätigt ist die Weitergabe erst durch den Klick der empfangenden Person."
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
      action={() => scanGiveToMeeple(gameCopyId, selected)}
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

/** Umlagern — Zieleinheit per Auswahl oder Scan des Einheiten-Codes. */
export function RelocateGameDialog({ gameCopyId }: { gameCopyId: string }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className={TRIGGER_CLASS}>
          Umlagern
        </Button>
      }
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

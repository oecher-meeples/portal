"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createStorageUnit } from "@/components/feature/admin-einheiten/actions";

/** Ein gescanntes, noch unbekanntes Einheiten-Etikett
 * (`/admin/einheiten?neu=box-0001`, #549) — Art und Code stehen damit fest. */
export type ScannedUnitPrefill = { kind: "BOX" | "SHELF"; code: string };

export function CreateStorageUnitDialog({
  prefill,
}: {
  prefill?: ScannedUnitPrefill;
} = {}) {
  const [open, setOpen] = useState(Boolean(prefill));
  // Nur fürs erste Anlegen — danach ist der Code vergeben, der nächste
  // Dialog vergibt wieder fortlaufend.
  const [scanned, setScanned] = useState(prefill);
  const [kind, setKind] = useState<"BOX" | "SHELF">(prefill?.kind ?? "BOX");
  const [label, setLabel] = useState("");
  const [locationNote, setLocationNote] = useState("");

  function reset() {
    setKind("BOX");
    setLabel("");
    setLocationNote("");
  }

  return (
    <ActionDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Einheit anlegen
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Neue Aufbewahrungseinheit"
      description={
        scanned
          ? `Code ${scanned.code} vom gescannten Etikett.`
          : "Der Code (z. B. OM-BOX-0004) wird automatisch fortlaufend vergeben."
      }
      submitLabel="Einheit anlegen"
      pendingLabel="Lege an…"
      canSubmit={Boolean(label.trim())}
      action={async () => {
        const result = await createStorageUnit({
          kind,
          label,
          code: scanned?.code,
          locationNote: locationNote || undefined,
        });
        if (!("error" in result)) setScanned(undefined);
        return result;
      }}
      onReset={reset}
    >
      {!scanned && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={kind === "BOX" ? "default" : "outline"}
            onClick={() => setKind("BOX")}
          >
            Karton
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kind === "SHELF" ? "default" : "outline"}
            onClick={() => setKind("SHELF")}
          >
            Regal
          </Button>
        </div>
      )}

      <TextField
        id="unit-label"
        label="Label"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        required
      />
      <TextField
        id="unit-location"
        label="Ortsangabe (optional)"
        value={locationNote}
        onChange={(event) => setLocationNote(event.target.value)}
        placeholder="z. B. Keller links"
      />
    </ActionDialog>
  );
}

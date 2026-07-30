"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createStorageUnit } from "@/components/feature/admin-einheiten/actions";

export function CreateStorageUnitDialog() {
  const [kind, setKind] = useState<"BOX" | "SHELF">("BOX");
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
      title="Neue Aufbewahrungseinheit"
      description="Der Code (z. B. OM-BOX-0004) wird automatisch fortlaufend vergeben."
      submitLabel="Einheit anlegen"
      pendingLabel="Lege an…"
      canSubmit={Boolean(label.trim())}
      action={() =>
        createStorageUnit({
          kind,
          label,
          locationNote: locationNote || undefined,
        })
      }
      onReset={reset}
    >
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

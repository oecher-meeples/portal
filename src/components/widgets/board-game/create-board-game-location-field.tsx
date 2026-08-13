"use client";

import { useState } from "react";
import { StorageUnitKind } from "@prisma/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import {
  createStorageUnit,
  findStorageUnitByCode,
} from "@/lib/ludothek/storage-units";

export type LocationPlacement = { unitId: string } | { self: true };

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "found"; label: string }
  | { kind: "not-found" }
  | { kind: "self" }
  | { kind: "error"; message: string };

/**
 * Optional Standort for the first copy of a newly created title — resolves
 * a scanned/typed unit code, offers to create the unit on a miss, or lets
 * the creator claim the copy for themselves directly (#121/#122). Placing
 * something here means `createBoardGame` skips "Unsortiert".
 */
export function CreateBoardGameLocationField({
  onResolved,
}: {
  onResolved: (placement: LocationPlacement | null) => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function checkCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    setStatus({ kind: "checking" });
    const unit = await findStorageUnitByCode(trimmed);
    if (unit) {
      setStatus({ kind: "found", label: unit.label });
      onResolved({ unitId: unit.id });
    } else {
      setStatus({ kind: "not-found" });
      onResolved(null);
    }
  }

  async function createAndAssignToSelf() {
    const code = codeInput.trim().toUpperCase();
    const kind = code.startsWith("OM-SHELF-")
      ? StorageUnitKind.SHELF
      : StorageUnitKind.BOX;

    const result = await createStorageUnit({
      kind,
      label: code,
      code,
      keeperMeepleId: "self",
    });

    if ("error" in result) {
      setStatus({
        kind: "error",
        message: result.error ?? "Unbekannter Fehler.",
      });
      return;
    }

    setStatus({ kind: "found", label: code });
    onResolved({ unitId: result.id });
  }

  function assignToSelf() {
    setCodeInput("");
    setStatus({ kind: "self" });
    onResolved({ self: true });
  }

  return (
    <Field label="Standort (optional)" htmlFor="game-location">
      <div className="flex gap-2">
        <Input
          id="game-location"
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value)}
          onBlur={() => checkCode(codeInput)}
          placeholder="Code der Aufbewahrungseinheit"
        />
        <ScanSearchDialog
          onScanned={(text) => {
            setCodeInput(text);
            checkCode(text);
          }}
        />
        <Button type="button" variant="outline" onClick={assignToSelf}>
          Mir zuweisen
        </Button>
      </div>

      {status.kind === "checking" && (
        <p className="text-muted-foreground text-xs">Prüfe…</p>
      )}
      {status.kind === "found" && (
        <p className="text-muted-foreground text-xs">
          Standort: {status.label}
        </p>
      )}
      {status.kind === "self" && (
        <p className="text-muted-foreground text-xs">Standort: bei dir</p>
      )}
      {status.kind === "error" && (
        <p className="text-destructive text-xs">{status.message}</p>
      )}
      {status.kind === "not-found" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-destructive text-xs">
            Keine Aufbewahrungseinheit mit diesem Code gefunden.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={createAndAssignToSelf}
          >
            Aufbewahrungseinheit neu anlegen und mir zuweisen
          </Button>
        </div>
      )}
    </Field>
  );
}

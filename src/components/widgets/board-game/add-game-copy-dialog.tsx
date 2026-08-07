"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { createGameCopy } from "@/lib/ludothek/game-copies";

/**
 * Adds another physical copy to an existing title — the "weiteres Exemplar"
 * flow (see ADR 0008). No BGG/title fields here, those already exist on the
 * title; only the new copy's own condition is asked for.
 */
export function AddGameCopyDialog({
  boardGameId,
  boardGameTitle,
}: {
  boardGameId: string;
  boardGameTitle: string;
}) {
  const [condition, setCondition] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm">
          <CopyPlus className="size-4" />
          Weiteres Exemplar
        </Button>
      }
      title={`Weiteres Exemplar von „${boardGameTitle}“ anlegen`}
      description="Das neue Exemplar liegt zunächst in „Unsortiert“ — Standort per Scan einlagern."
      submitLabel="Anlegen"
      action={() =>
        createGameCopy(boardGameId, { condition: condition || undefined })
      }
      onReset={() => setCondition("")}
    >
      <TextField
        id={`add-copy-${boardGameId}-condition`}
        label="Zustand"
        value={condition}
        onChange={(event) => setCondition(event.target.value)}
      />
    </ActionDialog>
  );
}

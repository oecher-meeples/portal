"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { deinventoriseGameCopy } from "@/lib/ludothek/game-copies";

export function DeinventoriseBoardGameDialog({
  gameId,
  gameTitle,
  open,
  onOpenChange,
}: {
  gameId: string;
  gameTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [addToSpareParts, setAddToSpareParts] = useState(false);

  return (
    <ActionDialog
      refresh
      trigger={
        open === undefined ? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Deinventarisieren
          </Button>
        ) : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      title={`„${gameTitle}“ deinventarisieren`}
      description="Das Spiel bleibt erhalten, wird aber als ausgemustert markiert und nicht mehr aktiv geführt."
      submitLabel="Deinventarisieren"
      canSubmit={Boolean(reason.trim())}
      action={() => deinventoriseGameCopy(gameId, reason, addToSpareParts)}
      onReset={() => {
        setReason("");
        setAddToSpareParts(false);
      }}
    >
      <Field label="Grund" htmlFor="deinventorise-reason">
        <Textarea
          id="deinventorise-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={addToSpareParts}
          onChange={(event) => setAddToSpareParts(event.target.checked)}
        />
        Teile ins Ersatzteillager aufnehmen
      </label>
    </ActionDialog>
  );
}

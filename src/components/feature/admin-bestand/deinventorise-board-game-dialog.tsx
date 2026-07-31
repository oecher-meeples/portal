"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deinventoriseBoardGame } from "@/lib/ludothek/board-games";

export function DeinventoriseBoardGameDialog({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const [reason, setReason] = useState("");

  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Deinventarisieren
        </Button>
      }
      title={`„${gameTitle}“ deinventarisieren`}
      description="Das Spiel bleibt erhalten, wird aber als ausgemustert markiert und nicht mehr aktiv geführt."
      submitLabel="Deinventarisieren"
      canSubmit={Boolean(reason.trim())}
      action={() => deinventoriseBoardGame(gameId, reason)}
      onReset={() => setReason("")}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deinventorise-reason">Grund</Label>
        <Textarea
          id="deinventorise-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </div>
    </ActionDialog>
  );
}

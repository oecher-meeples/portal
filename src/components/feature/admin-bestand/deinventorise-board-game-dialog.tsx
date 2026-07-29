"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deinventoriseBoardGame } from "@/components/feature/admin-bestand/actions";

export function DeinventoriseBoardGameDialog({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setReason("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const result = await deinventoriseBoardGame(gameId, reason);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Deinventarisieren
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>„{gameTitle}“ deinventarisieren</DialogTitle>
          <DialogDescription>
            Das Spiel bleibt erhalten, wird aber als ausgemustert markiert und
            nicht mehr aktiv geführt.
          </DialogDescription>
        </DialogHeader>
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
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? "Speichere…" : "Deinventarisieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

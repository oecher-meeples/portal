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
import {
  getOpenHoldingsSummary,
  recordResignation,
} from "@/components/feature/admin-mitglieder/actions";

function nextTurnOfTheYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
}

export function ResignMembershipDialog({
  meepleId,
  displayName,
}: {
  meepleId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<{ games: number; units: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setError(null);
    if (nextOpen) {
      setSummary(await getOpenHoldingsSummary(meepleId));
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    await recordResignation(meepleId, nextTurnOfTheYear());
    setIsSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Kündigung vermerken
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kündigung für „{displayName}“ vermerken</DialogTitle>
          <DialogDescription>
            Die Mitgliedschaft läuft bis zum Jahreswechsel unverändert weiter —
            ausleihen bleibt bis dahin möglich.
          </DialogDescription>
        </DialogHeader>
        {summary && (summary.games > 0 || summary.units > 0) && (
          <p className="bg-primary/10 rounded-md p-3 text-sm">
            Bei diesem Mitglied liegen aktuell {summary.games}{" "}
            {summary.games === 1 ? "Spiel" : "Spiele"} und {summary.units}{" "}
            {summary.units === 1 ? "Einheit" : "Einheiten"}. Das blockiert die
            Kündigung nicht, wird aber ab Dezember als Rückholliste angezeigt.
          </p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Speichere…" : "Kündigung vermerken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { anonymiseMeeple } from "@/components/feature/admin-mitglieder/actions";

export function AnonymiseMeepleDialog({
  meepleId,
  displayName,
}: {
  meepleId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    const result = await anonymiseMeeple(meepleId);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          />
        }
      >
        Anonymisieren
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>„{displayName}“ anonymisieren</DialogTitle>
          <DialogDescription>
            Löscht unwiderruflich das Login-Konto, den Namen, die E-Mail-Adresse
            und alle Bankdaten dieses Mitglieds. Aufenthalte und Spielergesuche
            bleiben als namenloser Rest lesbar.
          </DialogDescription>
        </DialogHeader>
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          <li>Login-Konto und Sitzungen (Neon Auth)</li>
          <li>Anzeigename, E-Mail, BGG-/BGA-Username</li>
          <li>Kontoinhaber, IBAN</li>
        </ul>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Anonymisiere…" : "Endgültig anonymisieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

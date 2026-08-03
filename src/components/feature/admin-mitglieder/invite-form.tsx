"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";

export function InviteForm() {
  const [isPending, setIsPending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateInvite() {
    setIsPending(true);
    setError(null);

    try {
      const { token } = await createInvite();
      const registrationUrl = `${window.location.origin}/registrieren?token=${token}`;
      setInviteLink(registrationUrl);
    } catch {
      setError("Einladung konnte nicht erzeugt werden.");
    } finally {
      setIsPending(false);
    }
  }

  const mailtoHref = inviteLink
    ? `mailto:?subject=${encodeURIComponent(
        "Einladung zu Oecher Meeples",
      )}&body=${encodeURIComponent(
        `Hallo!\n\nDu bist eingeladen, dem Oecher-Meeples-Portal beizutreten. Registriere dich über diesen Link:\n${inviteLink}\n\nDer Link ist 7 Tage gültig.`,
      )}`
    : null;

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
      <Button onClick={handleCreateInvite} disabled={isPending}>
        {isPending ? "Erzeuge Einladung…" : "+ Einladung erzeugen"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {inviteLink && mailtoHref && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            Registrierungslink (7 Tage gültig):
          </p>
          <code className="bg-muted rounded px-2 py-1 text-xs break-all">
            {inviteLink}
          </code>
          <a href={mailtoHref} className="text-primary text-sm hover:underline">
            Per E-Mail versenden
          </a>
        </div>
      )}
    </div>
  );
}

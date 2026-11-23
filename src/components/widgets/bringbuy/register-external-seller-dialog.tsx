"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { registerExternalSeller } from "@/lib/bringbuy/external-sellers";

/**
 * Popup für externe, nicht als Meeple angemeldete Verkäufer:innen (#266) —
 * Vereinsmitglieder benötigen dafür kein Token, sie gelangen direkt über
 * ihre bestehende Anmeldung zur eigenen Verkäuferseite. Kein `ActionDialog`,
 * weil das nach Erfolg sofort schließt — hier soll die Bestätigung
 * ("prüfe deine E-Mails") erst noch sichtbar bleiben.
 */
export function RegisterExternalSellerDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setHandle("");
      setEmail("");
      setError(null);
      setRegistered(false);
    }
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await registerExternalSeller({
      eventId,
      name,
      handle,
      email,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRegistered(true);
  }

  return (
    <>
      <Button size="sm" onClick={() => handleOpenChange(true)}>
        Spieleverkauf anmelden
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spieleverkauf anmelden</DialogTitle>
            {!registered && (
              <DialogDescription>
                Du bekommst per E-Mail einen persönlichen Link, über den du
                deine Artikel anmeldest.
              </DialogDescription>
            )}
          </DialogHeader>

          {registered ? (
            <p className="text-sm">
              Prüfe deine E-Mails — der Link zu deiner Verkäuferseite ist
              unterwegs.
            </p>
          ) : (
            <>
              <TextField
                id="external-seller-name"
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <TextField
                id="external-seller-handle"
                label="Kürzel"
                hint="Erscheint an der Kasse, z. B. deine Initialen."
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                required
              />
              <TextField
                id="external-seller-email"
                label="E-Mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </>
          )}

          <DialogFooter>
            {registered ? (
              <Button onClick={() => handleOpenChange(false)}>Fertig</Button>
            ) : (
              <Button
                disabled={
                  pending || !name.trim() || !handle.trim() || !email.trim()
                }
                onClick={handleSubmit}
              >
                {pending ? "Sende…" : "Anmelden"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

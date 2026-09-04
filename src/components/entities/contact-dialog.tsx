"use client";

import { useState } from "react";
import { MailIcon, MapPinIcon, MessageCircleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { cn } from "@/lib/utils/cn";
import type { ContactDialogMeeple } from "@/lib/members/contact";

/**
 * Eigenständiger, wiederverwendbarer Kontakt-Dialog — gehört zu keinem
 * Feature, wird von überall importiert, wo eine Person
 * dargestellt wird (LFG-Teilnehmerliste, Ludothek-Standortkette,
 * Markt-Karten, Ersatzteile, …). Zeigt beim Öffnen groß und zentriert das
 * Profilbild (Fallback: Initiale) und darunter jede hinterlegte
 * Kontaktmöglichkeit.
 *
 * Zwei Eingabewege, damit keine Aufrufstelle die Sichtbarkeitsprüfung
 * (#389) oder `getContactLinks()` selbst nachbauen muss:
 * - `meeple`: die Aufrufstelle hat die Daten bereits geladen (z. B. eine
 *   Server-Komponente mit eigenem Betrachter-Kontext wie dem
 *   Gast-Bereich) — `toContactDialogMeeple()` aus `lib/members/contact.ts`
 *   baut die passende Form.
 * - `meepleId`: die Aufrufstelle kennt nur die Id — der Dialog lädt die
 *   Daten selbst nach, erst beim Öffnen (`fetchContactDialogMeeple()`,
 *   nur für eingeloggte Meeple, siehe dort).
 *
 * `name` bleibt in beiden Fällen ein eigenes Pflicht-Prop: der Trigger
 * braucht ihn schon vor dem (im `meepleId`-Fall erst beim Öffnen
 * passierenden) Laden.
 */
export function ContactDialog({
  name,
  meeple,
  meepleId,
  className,
}: {
  name: string;
  className?: string;
} & (
  | { meeple: ContactDialogMeeple; meepleId?: never }
  | { meeple?: never; meepleId: string }
)) {
  const [loaded, setLoaded] = useState<ContactDialogMeeple | null>(
    meeple ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenChange(open: boolean) {
    if (!open || loaded || !meepleId || loading) return;
    setLoading(true);
    setError(null);
    try {
      // Dynamischer statt statischer Import: die "use server"-Action zieht
      // den kompletten Server-Layer (Prisma, Neon-Auth-Session) mit — mit
      // einem statischen Import würde jede Test-Datei, die irgendeine
      // ContactDialog-Aufrufstelle rendert, diesen Layer transitiv laden,
      // egal ob der meepleId-Pfad überhaupt genutzt wird. So passiert das
      // erst beim tatsächlichen Öffnen eines meepleId-Dialogs.
      const { fetchContactDialogMeeple } =
        await import("@/lib/members/contact-dialog");
      const result = await fetchContactDialogMeeple(meepleId);
      if (result) {
        setLoaded(result);
      } else {
        setError("Kontaktdaten konnten nicht geladen werden.");
      }
    } catch {
      setError("Kontaktdaten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  const contact = loaded?.contact;
  const hasAnyContact = Boolean(
    contact &&
    (contact.mailHref ||
      contact.telegramHref ||
      contact.signalHref ||
      contact.discordHandle ||
      contact.address),
  );

  // Nur im meeple-Fall schon vorab bekannt — vermeidet einen Dialog, der
  // beim Öffnen ohnehin nichts zu zeigen hätte. Im meepleId-Fall steht das
  // erst nach dem Laden fest, dort bleibt der Trigger immer klickbar.
  if (meeple && !hasAnyContact) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "hover:text-primary underline-offset-2 hover:underline",
              className,
            )}
          >
            {name}
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <MeepleAvatar
            name={name}
            profilePictureUrl={loaded?.profilePictureUrl ?? null}
            size="lg"
            className="mx-auto"
          />
          <DialogTitle className="text-center">{name} kontaktieren</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {loading && (
            <p className="text-muted-foreground text-center text-sm">
              Lade Kontaktdaten …
            </p>
          )}
          {error && (
            <p className="text-destructive text-center text-sm">{error}</p>
          )}
          {contact?.mailHref && (
            <Button
              className="gap-1.5"
              render={
                <a href={contact.mailHref}>
                  <MailIcon className="size-4" />
                  E-Mail
                </a>
              }
            />
          )}
          {contact?.telegramHref && (
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a href={contact.telegramHref} target="_blank" rel="noreferrer">
                  Telegram
                </a>
              }
            />
          )}
          {contact?.signalHref && (
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a href={contact.signalHref} target="_blank" rel="noreferrer">
                  Signal
                </a>
              }
            />
          )}
          {contact?.discordHandle && (
            <CopyButton
              value={contact.discordHandle}
              label={`Discord: ${contact.discordHandle}`}
              icon={MessageCircleIcon}
            />
          )}
          {contact?.address && (
            <div className="border-input flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
              <p className="whitespace-pre-line">{contact.address}</p>
              <CopyButton
                value={contact.address}
                label="Kopieren"
                icon={MapPinIcon}
              />
            </div>
          )}
          {loaded && !hasAnyContact && !error && (
            <p className="text-muted-foreground text-center text-sm">
              Keine Kontaktmöglichkeiten hinterlegt.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

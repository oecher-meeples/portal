import { MailIcon, MapPinIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { ContactLinks } from "@/lib/members/contact";

/** Rendert jede hinterlegte Kontaktmöglichkeit als Button/Copy-Feld —
 * extrahiert aus `ContactDialog`, weil `GuestMeepleProfileView` (#412-Folge,
 * Gast-Profilseite eines anwesenden Erklärbären) exakt dieselbe Liste
 * braucht, nur außerhalb eines Dialogs. Kein eigener "leer"-Hinweis hier
 * (anders als `ContactDialog`) — je nach Einbettung unterscheidet sich, ob
 * ein solcher Hinweis überhaupt sinnvoll ist. */
export function ContactChannelsList({ contact }: { contact: ContactLinks }) {
  return (
    <>
      {contact.mailHref && (
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
      {contact.telegramHref && (
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
      {contact.signalHref && (
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
      {contact.discordHandle && (
        <CopyButton
          value={contact.discordHandle}
          label={`Discord: ${contact.discordHandle}`}
          icon={MessageCircleIcon}
        />
      )}
      {contact.address && (
        <div className="border-input flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
          <p className="whitespace-pre-line">{contact.address}</p>
          <CopyButton
            value={contact.address}
            label="Kopieren"
            icon={MapPinIcon}
          />
        </div>
      )}
    </>
  );
}

/** Ob `contact` mindestens einen Kanal enthält — geteilt, damit
 * `ContactDialog` und künftige Aufrufer denselben "gibt es überhaupt was zu
 * zeigen"-Check verwenden. */
export function hasAnyContactChannel(
  contact: ContactLinks | undefined,
): boolean {
  return Boolean(
    contact &&
    (contact.mailHref ||
      contact.telegramHref ||
      contact.signalHref ||
      contact.discordHandle ||
      contact.address),
  );
}

"use client";

import { ContactDialog } from "@/components/entities/contact-dialog";
import { fetchContactDialogMeeple } from "@/lib/members/contact-dialog";

/**
 * `ContactDialog` für Aufrufstellen, die nur eine `meepleId` kennen: die
 * Kontaktdaten werden erst beim Öffnen per `fetchContactDialogMeeple()`
 * nachgeladen (nur für eingeloggte Meeple). Die Entity `ContactDialog` selbst
 * kennt keine Datenbeschaffung — hier sitzt die Anbindung.
 */
export function MeepleContactDialog({
  name,
  meepleId,
  className,
}: {
  name: string;
  meepleId: string;
  className?: string;
}) {
  return (
    <ContactDialog
      name={name}
      meepleId={meepleId}
      loadMeeple={fetchContactDialogMeeple}
      className={className}
    />
  );
}

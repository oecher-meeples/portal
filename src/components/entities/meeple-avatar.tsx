"use client";

import { ProfilePictureVisibility } from "@prisma/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  type AvatarSize,
} from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import {
  resolveVisibleProfilePictureUrl,
  type ProfilePictureViewer,
} from "@/lib/members/profile-picture-visibility";

/** Feste Größe für den Vergrößert-Dialog (siehe `MeepleAvatar` unten) —
 * unabhängig von der Größenstufe des angeklickten Avatars, damit ein
 * `sm`-Avatar in der Tabelle genauso groß aufgeht wie ein `xxxl`-Avatar im
 * Kontakt-Dialog. Als Tailwind-Arbitrary-Value statt Inline-`style`, analog
 * `size-[…px]` in `ui/avatar.tsx` — ein Inline-`style` reichte hier nicht
 * verlässlich durch das `grid`-Layout von `DialogContent` durch (das Bild
 * blieb auf sein natürliches Seitenverhältnis skaliert statt exakt
 * quadratisch zugeschnitten). */
const ENLARGED_SIZE_CLASS = "size-[196px]";

/** (#412) Zeigt ein Meeple mit Bild an, wo bisher nur der Name/ein
 * Initialen-Kreis stand — kapselt die Sichtbarkeitsprüfung aus #389, damit
 * jede Anzeigestelle nur noch Bild-URL, Freigabe und den eigenen
 * Betrachter-Kontext (Meeple vs. Gast) durchreichen muss. Ersetzt die
 * bisherigen bespoke Initialen-Kreise (z. B. `lfg-detail-view.tsx`).
 *
 * Ist ein Bild sichtbar, öffnet ein Klick darauf einen Dialog mit dem Bild
 * in {@link ENLARGED_SIZE_PX}px — eine Stelle für dieses Verhalten statt
 * einer Extra-Lightbox-Komponente pro Aufrufstelle. Ohne Bild (nur
 * Initialen) gibt es nichts zu vergrößern, der Avatar bleibt dann
 * unklickbar. */
export function MeepleAvatar({
  name,
  profilePictureUrl,
  profilePictureVisibility,
  viewer,
  size,
  className,
  hideWithoutPicture = false,
}: {
  name: string;
  profilePictureUrl: string | null;
  /** Weggelassen (zusammen mit `viewer`), wenn der Aufrufer die
   * Sichtbarkeitsprüfung bereits serverseitig durchgeführt hat (z. B.
   * Gast-Bereich, #412: die "Events"-Freigabe hängt an der laufenden
   * Event-Anwesenheit, die nur dort bekannt ist) — `profilePictureUrl` gilt
   * dann als bereits geprüft und wird unverändert übernommen. */
  profilePictureVisibility?: ProfilePictureVisibility;
  viewer?: ProfilePictureViewer;
  size: AvatarSize;
  className?: string;
  /** `true`, wenn ein leerer Initialen-Kreis an dieser Stelle nicht
   * hinzugezogen werden soll — der Avatar rendert dann gar nichts, statt auf
   * die Initiale zurückzufallen. Für ein Bild-Portrait (Profil-Kopfzeile,
   * `ContactDialog`, Standort-Tooltip): ohne Bild gibt es dort nichts zu
   * zeigen, ein Initialen-Kreis wäre nur Platzhalter-Rauschen. Für die
   * kompakten Listen-Avatare neben dem Namen (Tabellen, Teilnehmerlisten, …)
   * bleibt die Initiale dagegen die einzige visuelle Unterscheidung in der
   * Zeile — dort default `false`. */
  hideWithoutPicture?: boolean;
}) {
  const visibleUrl =
    profilePictureVisibility && viewer
      ? resolveVisibleProfilePictureUrl(
          { profilePictureUrl, profilePictureVisibility },
          viewer,
        )
      : profilePictureUrl;

  if (!visibleUrl && hideWithoutPicture) return null;

  const avatar = (
    <Avatar size={size} className={className}>
      {visibleUrl && <AvatarImage src={visibleUrl} alt={name} />}
      <AvatarFallback>{initialsFor(name)}</AvatarFallback>
    </Avatar>
  );

  if (!visibleUrl) return avatar;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Profilbild von ${name} vergrößern`}
            className="cursor-zoom-in rounded-full"
          >
            {avatar}
          </button>
        }
      />
      <DialogContent className="w-fit p-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob-URL, kein next/image nötig (wie profile-picture-upload.tsx) */}
        <img
          src={visibleUrl}
          alt={name}
          className={cn(ENLARGED_SIZE_CLASS, "rounded-md object-cover")}
        />
      </DialogContent>
    </Dialog>
  );
}

function initialsFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

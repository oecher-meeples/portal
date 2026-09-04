import { ProfilePictureVisibility } from "@prisma/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  type AvatarSize,
} from "@/components/ui/avatar";
import {
  resolveVisibleProfilePictureUrl,
  type ProfilePictureViewer,
} from "@/lib/members/profile-picture-visibility";

/** (#412) Zeigt ein Meeple mit Bild an, wo bisher nur der Name/ein
 * Initialen-Kreis stand — kapselt die Sichtbarkeitsprüfung aus #389, damit
 * jede Anzeigestelle nur noch Bild-URL, Freigabe und den eigenen
 * Betrachter-Kontext (Meeple vs. Gast) durchreichen muss. Ersetzt die
 * bisherigen bespoke Initialen-Kreise (z. B. `lfg-detail-view.tsx`). */
export function MeepleAvatar({
  name,
  profilePictureUrl,
  profilePictureVisibility,
  viewer,
  size,
  className,
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
}) {
  const visibleUrl =
    profilePictureVisibility && viewer
      ? resolveVisibleProfilePictureUrl(
          { profilePictureUrl, profilePictureVisibility },
          viewer,
        )
      : profilePictureUrl;

  return (
    <Avatar size={size} className={className}>
      {visibleUrl && <AvatarImage src={visibleUrl} alt={name} />}
      <AvatarFallback>{initialsFor(name)}</AvatarFallback>
    </Avatar>
  );
}

function initialsFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

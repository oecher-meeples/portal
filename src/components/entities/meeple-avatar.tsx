import { ProfilePictureVisibility } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  profilePictureVisibility: ProfilePictureVisibility;
  viewer: ProfilePictureViewer;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const visibleUrl = resolveVisibleProfilePictureUrl(
    { profilePictureUrl, profilePictureVisibility },
    viewer,
  );

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

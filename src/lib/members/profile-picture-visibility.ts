import { ProfilePictureVisibility } from "@prisma/client";

/** Deutsche Labels für die Freigabe-Auswahl im Meeple-Daten-Bereich (#389). */
export const PROFILE_PICTURE_VISIBILITY_LABELS: Record<
  ProfilePictureVisibility,
  string
> = {
  INTERN: "Intern (alle eingeloggten Meeple)",
  EVENTS: "Events (zusätzlich Gäste, solange als Erklärbär anwesend)",
  IMMER: "Immer (öffentlich, auch außerhalb von Events)",
};

/** Kurzform ohne Erklärtext — für enge Layout-Slots wie das
 * Sichtbarkeits-Dropdown in der Kopfzeile von `meeple-daten-section.tsx`
 * (Live-Review F2), wo die Langform zu Textumbruch führt. */
export const PROFILE_PICTURE_VISIBILITY_SHORT_LABELS: Record<
  ProfilePictureVisibility,
  string
> = {
  INTERN: "Intern",
  EVENTS: "Events",
  IMMER: "Immer",
};

/** Wer das Profilbild gerade anfragt (#389) — für einen Gast zählt nur, ob
 * er es an genau dieser Stelle im Gast-Bereich sieht, während das
 * betreffende Meeple aktiv als Erklärbär bei einem laufenden Event
 * anwesend ist (`ExplainerAttendance`). */
export type ProfilePictureViewer =
  { kind: "meeple" } | { kind: "guest"; isAttendingExplainerNow: boolean };

/** Pure Sichtbarkeitsregel (analog `isEventVisible`) — INTERN für jedes
 * eingeloggte Meeple, EVENTS zusätzlich für Gäste nur während aktiver
 * Anwesenheit bei einem laufenden Event, IMMER dauerhaft öffentlich. */
export function isProfilePictureVisible(
  visibility: ProfilePictureVisibility,
  viewer: ProfilePictureViewer,
): boolean {
  if (visibility === ProfilePictureVisibility.IMMER) return true;
  if (viewer.kind === "meeple") return true;
  if (visibility === ProfilePictureVisibility.EVENTS) {
    return viewer.isAttendingExplainerNow;
  }
  return false;
}

/** Liefert die Bild-URL nur, wenn sie laut Freigabe für diesen Betrachter
 * sichtbar ist — sonst `null`, nie die URL "versteckt" im DOM. */
export function resolveVisibleProfilePictureUrl(
  meeple: {
    profilePictureUrl: string | null;
    profilePictureVisibility: ProfilePictureVisibility;
  },
  viewer: ProfilePictureViewer,
): string | null {
  if (!meeple.profilePictureUrl) return null;
  return isProfilePictureVisible(meeple.profilePictureVisibility, viewer)
    ? meeple.profilePictureUrl
    : null;
}

import { prisma } from "@/lib/utils/prisma";
import {
  getContactLinks,
  meepleEmail,
  type ContactLinks,
} from "@/lib/members/contact";
import {
  isProfilePictureVisible,
  resolveVisibleProfilePictureUrl,
  type ProfilePictureViewer,
} from "@/lib/members/profile-picture-visibility";

/** Vom "Profil ansehen"-Link in `ContactDialog`/`getAttendingExplainers()`
 * (`guest-area.ts`) angesteuerte Gast-Profilseite eines Erklärbären —
 * eigene Datei statt in `guest-area.ts` (die läge sonst über dem
 * 400-Zeilen-Limit), analog zur Trennung Schreib-/Leseseite bei
 * `holdings.ts`/`holdings-lookup.ts`. */
export type GuestVisibleMeepleProfile = {
  displayName: string;
  profilePictureUrl: string | null;
  bggUsername: string | null;
  bgaUsername: string | null;
  contact: ContactLinks;
};

/**
 * Lädt ein Meeple-Profil für einen Gast auf `/events/[slug]/gast/erklaerbaer/
 * [meepleId]` — `null`, wenn das Meeple nicht existiert, laut
 * `meepleDatenVisibility` nicht sichtbar ist, oder (bei `EVENTS`) gerade
 * nicht als Erklärbär bei diesem Event anwesend ist. Die Route selbst prüft
 * zusätzlich, dass das Event existiert und sichtbar ist — diese Funktion
 * kennt nur den Meeple-/Anwesenheits-Teil der Regel.
 */
export async function loadGuestVisibleMeepleProfile(
  meepleId: string,
  eventId: string,
): Promise<GuestVisibleMeepleProfile | null> {
  const [meeple, attendance] = await Promise.all([
    prisma.meeple.findUnique({
      where: { id: meepleId },
      select: {
        displayName: true,
        profilePictureUrl: true,
        profilePictureVisibility: true,
        meepleDatenVisibility: true,
        bggUsername: true,
        bgaUsername: true,
        telegramHandle: true,
        signalHandle: true,
        discordHandle: true,
        address: true,
        shareAddress: true,
        member: { select: { email: true } },
      },
    }),
    prisma.explainerAttendance.findUnique({
      where: { eventId_meepleId: { eventId, meepleId } },
    }),
  ]);
  if (!meeple) return null;

  const viewer: ProfilePictureViewer = {
    kind: "guest",
    isAttendingExplainerNow: attendance !== null,
  };
  if (!isProfilePictureVisible(meeple.meepleDatenVisibility, viewer)) {
    return null;
  }

  return {
    displayName: meeple.displayName,
    profilePictureUrl: resolveVisibleProfilePictureUrl(meeple, viewer),
    bggUsername: meeple.bggUsername,
    bgaUsername: meeple.bgaUsername,
    contact: getContactLinks({ ...meeple, email: meepleEmail(meeple) }),
  };
}

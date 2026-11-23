import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { isEventVisible } from "@/lib/events/visibility";
import { loadGuestVisibleMeepleProfile } from "@/lib/events/guest-profile";
import { GuestMeepleProfileView } from "@/components/feature/guest-area/guest-meeple-profile-view";

/** Ziel des "Profil ansehen"-Links, den `ContactDialog` für einen Gast
 * anzeigt (siehe `getAttendingExplainers()` in `guest-area.ts`) — nur
 * erreichbar, solange das Event sichtbar ist und das Meeple laut
 * `meepleDatenVisibility` für diesen Gast freigegeben hat. */
export default async function GuestErklaerbaerProfilePage({
  params,
}: {
  params: Promise<{ slug: string; meepleId: string }>;
}) {
  const { slug, meepleId } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const [tier, user] = await Promise.all([getSessionTier(), getCurrentUser()]);
  const canManageEvents =
    !!user && (await hasPermission(user.id, "events:manage"));
  if (!isEventVisible(event.visibility, { tier, canManageEvents })) {
    notFound();
  }

  const profile = await loadGuestVisibleMeepleProfile(meepleId, event.id);
  if (!profile) notFound();

  return <GuestMeepleProfileView profile={profile} />;
}

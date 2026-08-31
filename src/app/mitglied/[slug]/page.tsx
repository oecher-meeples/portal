import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireMember } from "@/lib/auth/session";
import {
  canAccessMemberProfile,
  loadProfileViewerContext,
} from "@/lib/members/profile-access";
import { MitgliedProfilView } from "@/components/feature/mitglied-profil/mitglied-profil-view";

export default async function MitgliedProfilPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireMember();

  const member = await prisma.member.findUnique({
    where: { slug },
    include: {
      meeple: {
        select: {
          id: true,
          displayName: true,
          bggUsername: true,
          bgaUsername: true,
          telegramHandle: true,
          signalHandle: true,
          discordHandle: true,
          address: true,
          shareAddress: true,
          doorbellNote: true,
        },
      },
    },
  });
  if (!member) notFound();

  const viewer = await loadProfileViewerContext(session, member.id);
  if (!canAccessMemberProfile(member, viewer)) notFound();

  return <MitgliedProfilView member={member} viewer={viewer} />;
}

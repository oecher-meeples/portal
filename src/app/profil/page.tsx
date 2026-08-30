import { prisma } from "@/lib/utils/prisma";
import { requireMember } from "@/lib/auth/session";
import { ProfilView } from "@/components/feature/profil/profil-view";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { findMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";
import {
  canForceImport,
  getImportCooldownEndsAt,
  getOwnPrivateCollection,
} from "@/lib/ludothek/private-collection";

export default async function ProfilPage() {
  const { meeple, membershipState } = await requireMember();

  const [
    member,
    openDeletionRequest,
    openHoldings,
    newsletterPreference,
    privateCollection,
    privateCollectionImportCooldownEndsAt,
    canForceImportCollection,
  ] = await Promise.all([
    prisma.member.findUnique({ where: { meepleId: meeple.id } }),
    findOpenDeletionRequest(meeple.id),
    countOpenHoldings(meeple.id),
    findMeepleNewsletterPreference(meeple.id),
    getOwnPrivateCollection(meeple.id),
    getImportCooldownEndsAt(meeple),
    canForceImport(meeple.neonAuthUserId),
  ]);

  return (
    <ProfilView
      meeple={meeple}
      member={member}
      membershipState={membershipState}
      deletionRequestedAt={openDeletionRequest?.requestedAt ?? null}
      openHoldings={openHoldings}
      newsletterPreference={newsletterPreference}
      privateCollection={privateCollection}
      privateCollectionImportCooldownEndsAt={
        privateCollectionImportCooldownEndsAt
      }
      canForceImportCollection={canForceImportCollection}
    />
  );
}

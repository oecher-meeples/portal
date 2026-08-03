import { requireMember } from "@/lib/auth/session";
import { ProfilView } from "@/components/feature/profil/profil-view";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { findMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";

export default async function ProfilPage() {
  const { meeple, membershipState } = await requireMember();

  const [openDeletionRequest, openHoldings, newsletterPreference] =
    await Promise.all([
      findOpenDeletionRequest(meeple.id),
      countOpenHoldings(meeple.id),
      findMeepleNewsletterPreference(meeple.id),
    ]);

  return (
    <ProfilView
      meeple={meeple}
      membershipState={membershipState}
      deletionRequestedAt={openDeletionRequest?.requestedAt ?? null}
      openHoldings={openHoldings}
      newsletterPreference={newsletterPreference}
    />
  );
}

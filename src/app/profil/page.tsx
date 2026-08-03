import { requireMember } from "@/lib/auth/session";
import { ProfilView } from "@/components/feature/profil/profil-view";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { countOpenHoldings } from "@/lib/members/open-holdings";

export default async function ProfilPage() {
  const { meeple, membershipState } = await requireMember();

  const [openDeletionRequest, openHoldings] = await Promise.all([
    findOpenDeletionRequest(meeple.id),
    countOpenHoldings(meeple.id),
  ]);

  return (
    <ProfilView
      meeple={meeple}
      membershipState={membershipState}
      deletionRequestedAt={openDeletionRequest?.requestedAt ?? null}
      openHoldings={openHoldings}
    />
  );
}

import { requireMember } from "@/lib/session";
import { ProfilView } from "@/components/feature/profil/profil-view";

export default async function ProfilPage() {
  const { meeple, membershipState } = await requireMember();

  return <ProfilView meeple={meeple} membershipState={membershipState} />;
}

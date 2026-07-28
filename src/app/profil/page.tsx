import { requireMember } from "@/lib/session";
import { ProfilMockView } from "@/components/feature/profil/profil-mock-view";

export default async function ProfilPage() {
  await requireMember();

  return <ProfilMockView />;
}

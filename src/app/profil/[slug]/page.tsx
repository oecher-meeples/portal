import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { loadMemberProfileData } from "@/lib/members/profile-access";
import { MitgliedProfilView } from "@/components/feature/mitglied-profil/mitglied-profil-view";

export default async function ProfilSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireMember();

  const data = await loadMemberProfileData(session, { slug });
  if (!data) notFound();

  return <MitgliedProfilView member={data.member} viewer={data.viewer} />;
}

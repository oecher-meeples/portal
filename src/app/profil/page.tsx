import { requireMember } from "@/lib/auth/session";
import { loadMemberProfileData } from "@/lib/members/profile-access";
import { PageHeading } from "@/components/ui/page-heading";
import { MitgliedProfilView } from "@/components/feature/mitglied-profil/mitglied-profil-view";

/** `/profil` zeigt das eigene Profil direkt (kein Redirect mehr auf einen
 * Slug-Pfad, Nutzerentscheidung) — dieselbe `MitgliedProfilView` wie
 * `/profil/[slug]` für fremde Profile, hier per `meepleId` statt `slug`
 * geladen (`loadMemberProfileData`). */
export default async function ProfilPage() {
  const session = await requireMember();

  const data = await loadMemberProfileData(session, {
    meepleId: session.meeple.id,
  });
  if (!data) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
        <PageHeading eyebrow="Self-Service" title="Mein Profil" />
        <p className="text-muted-foreground text-sm">
          Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende
          dich an den Vorstand.
        </p>
      </div>
    );
  }

  return <MitgliedProfilView member={data.member} viewer={data.viewer} />;
}

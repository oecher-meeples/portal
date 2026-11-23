import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { ContactChannelsList } from "@/components/entities/contact-channels-list";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import type { GuestVisibleMeepleProfile } from "@/lib/events/guest-profile";

/** Gast-Profilseite eines Erklärbären (`/events/[slug]/gast/erklaerbaer/
 * [meepleId]`) — erreicht über den "Profil ansehen"-Link im `ContactDialog`
 * der Erklärbären-Liste. Kein Formular, keine Mutation: reine Anzeige der
 * laut `meepleDatenVisibility` freigegebenen Angaben. */
export function GuestMeepleProfileView({
  profile,
}: {
  profile: GuestVisibleMeepleProfile;
}) {
  return (
    <PageContainer className="max-w-lg gap-6 px-4 py-8">
      <PageHeading
        eyebrow="Erklärbär"
        title={profile.displayName}
        media={
          <MeepleAvatar
            name={profile.displayName}
            profilePictureUrl={profile.profilePictureUrl}
            size="xxxl"
          />
        }
      />

      {(profile.bggUsername || profile.bgaUsername) && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {profile.bggUsername && (
            <div>
              <dt className="text-muted-foreground">BoardGameGeek</dt>
              <dd>{profile.bggUsername}</dd>
            </div>
          )}
          {profile.bgaUsername && (
            <div>
              <dt className="text-muted-foreground">Board Game Arena</dt>
              <dd>{profile.bgaUsername}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-2">
        <ContactChannelsList contact={profile.contact} />
      </div>
    </PageContainer>
  );
}

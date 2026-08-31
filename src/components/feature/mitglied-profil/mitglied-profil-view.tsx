import { PendingChangeKind, type Member } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { memberDisplayName } from "@/lib/members/member-display-name";
import {
  canViewBankSection,
  type ProfileViewerContext,
} from "@/lib/members/profile-access";
import { isMiniMeeple } from "@/lib/members/contribution";
import { listOpenPendingChangesForMember } from "@/lib/members/pending-changes";
import { getActiveHoldingsForMember } from "@/lib/ludothek/holdings-by-meeple";
import {
  canForceImport,
  getImportCooldownEndsAt,
  getOwnPrivateCollection,
} from "@/lib/ludothek/private-collection";
import { PrivateCollectionCard } from "@/components/widgets/private-collection/private-collection-card";
import { PrivateSpieleSection } from "@/components/feature/mitglied-profil/private-spiele-section";
import { findMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { NewsletterPreferencePanel } from "@/components/widgets/profil-panels/newsletter-preference-panel";
import { DataExportPanel } from "@/components/widgets/profil-panels/data-export-panel";
import { DeletionRequestPanel } from "@/components/widgets/profil-panels/deletion-request-panel";
import { ResignMembershipPanel } from "@/components/widgets/profil-panels/resign-membership-panel";
import { listTshirtSizes } from "@/lib/members/tshirt-sizes";
import { listChildrenOf } from "@/lib/members/guardians";
import { MeineKinderSection } from "@/components/feature/mitglied-profil/meine-kinder-section";
import {
  formatStammdatenDiffSummary,
  listOpenStammdatenChanges,
} from "@/lib/members/stammdaten";
import { decryptSecret, ibanLast4, maskIban } from "@/lib/utils/crypto";
import { StammdatenSection } from "@/components/feature/mitglied-profil/stammdaten-section";
import { BankverbindungSection } from "@/components/feature/mitglied-profil/bankverbindung-section";
import { VereinsspieleSection } from "@/components/feature/mitglied-profil/vereinsspiele-section";
import {
  MeepleDatenSection,
  type MeepleDatenMeeple,
} from "@/components/feature/mitglied-profil/meeple-daten-section";

/** Route-Einstieg für `/mitglied/[slug]` (#379 ff.) — setzt die einzelnen
 * Bereiche der Epic (#380–#385, #388, #389, #376) zusammen. Zugriffsschutz
 * läuft bereits vollständig in `page.tsx`/`profile-access.ts`. */
export async function MitgliedProfilView({
  member,
  viewer,
}: {
  member: Member & {
    meeple:
      | (MeepleDatenMeeple & {
          displayName: string;
          neonAuthUserId: string | null;
          privateCollectionVisible: boolean;
          privateCollectionSyncedAt: Date | null;
        })
      | null;
  };
  viewer: ProfileViewerContext;
}) {
  const isSelf = member.meepleId === viewer.currentMeepleId;
  const canRequestChange = isSelf || viewer.isGuardianOfTarget;

  const openStammdatenChanges = viewer.isAdmin
    ? await listOpenStammdatenChanges(member.id)
    : [];
  const tshirtSizes = await listTshirtSizes();
  const tshirtSizeLabelById = Object.fromEntries(
    tshirtSizes.map((size) => [size.id, size.label]),
  );

  const bankSectionVisible =
    canViewBankSection(member, viewer) && !isMiniMeeple(member);
  const openIbanChanges =
    bankSectionVisible && viewer.canReadBank
      ? await listOpenPendingChangesForMember(member.id, PendingChangeKind.IBAN)
      : [];

  const canViewVereinsspiele =
    viewer.canManageGames || isSelf || viewer.isGuardianOfTarget;
  const holdings = canViewVereinsspiele
    ? await getActiveHoldingsForMember(member.id)
    : [];

  const ownPrivateCollection =
    isSelf && member.meeple
      ? {
          entries: await getOwnPrivateCollection(member.meeple.id),
          cooldownEndsAt: await getImportCooldownEndsAt(member.meeple),
          canForceImport: await canForceImport(member.meeple.neonAuthUserId),
        }
      : null;

  // #376: strikt auf das eigene Profil begrenzt — niemals auf einer fremden
  // Profilseite geladen, auch nicht für admin:access/members:manage.
  const myChildren = isSelf ? await listChildrenOf(member.id) : [];

  const selfServiceData =
    isSelf && member.meeple
      ? {
          newsletterPreference: await findMeepleNewsletterPreference(
            member.meeple.id,
          ),
          openHoldings: await countOpenHoldings(member.meeple.id),
          deletionRequestedAt:
            (await findOpenDeletionRequest(member.meeple.id))?.requestedAt ??
            null,
        }
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <PageHeading
        eyebrow={`Mitglied Nr. ${member.memberNumber}`}
        title={memberDisplayName(member)}
        description={
          isSelf
            ? "Dein Mitgliedsprofil."
            : viewer.isGuardianOfTarget
              ? "Profil deines Kindes."
              : undefined
        }
      />

      <StammdatenSection
        member={member}
        canManage={viewer.canManageMembers}
        canRequestChange={canRequestChange}
        isAdmin={viewer.isAdmin}
        tshirtSizeOptions={tshirtSizes}
        openChanges={openStammdatenChanges.map((change) => ({
          id: change.id,
          memberDisplayName: memberDisplayName(member),
          memberNumber: member.memberNumber,
          displayValue: formatStammdatenDiffSummary(
            change.fieldsJson,
            tshirtSizeLabelById,
          ),
          requestedAt: change.requestedAt.toISOString(),
          confirmed: true,
        }))}
      />

      {bankSectionVisible && (
        <BankverbindungSection
          memberId={member.id}
          meepleId={member.meepleId}
          accountHolder={member.accountHolder}
          maskedIban={maskIban(member.ibanLast4)}
          hasIban={member.ibanEncrypted !== null}
          canEdit={viewer.canReadBank}
          openChanges={openIbanChanges.map((change) => ({
            id: change.id,
            memberDisplayName: memberDisplayName(member),
            memberNumber: member.memberNumber,
            displayValue: maskIban(ibanLast4(decryptSecret(change.newValue))),
            requestedAt: change.requestedAt.toISOString(),
            confirmed: true,
          }))}
        />
      )}

      {isSelf && <MeineKinderSection guardianChildren={myChildren} />}

      {canViewVereinsspiele && <VereinsspieleSection holdings={holdings} />}

      {member.meeple && (
        <MeepleDatenSection
          meeple={member.meeple}
          canEdit={isSelf || viewer.canManageMembers}
          showAddress={
            member.meeple.shareAddress || isSelf || viewer.canManageMembers
          }
        />
      )}

      {ownPrivateCollection && member.meeple && (
        <PrivateCollectionCard
          bggUsername={member.meeple.bggUsername}
          entries={ownPrivateCollection.entries}
          cooldownEndsAt={ownPrivateCollection.cooldownEndsAt}
          canForceImport={ownPrivateCollection.canForceImport}
          visibleToOthers={member.meeple.privateCollectionVisible}
        />
      )}
      {!isSelf && member.meeple?.privateCollectionVisible && (
        <PrivateSpieleSection meepleId={member.meeple.id} />
      )}

      {selfServiceData && (
        <>
          {member.email && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-serif text-lg font-bold">Newsletter</h2>
              <div className="mt-4">
                <NewsletterPreferencePanel
                  initialEnabled={selfServiceData.newsletterPreference.enabled}
                  initialCategories={
                    selfServiceData.newsletterPreference.categories
                  }
                />
              </div>
            </div>
          )}

          <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Datenschutz</h2>
            <DataExportPanel />
            <DeletionRequestPanel
              requestedAt={selfServiceData.deletionRequestedAt}
              openHoldings={selfServiceData.openHoldings}
            />
          </div>

          <div className="border-destructive/40 flex flex-col gap-3 rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">
              Mitgliedschaft beenden
            </h2>
            <ResignMembershipPanel
              resignedAt={member.resignedAt?.toISOString() ?? null}
              membershipEndsAt={member.membershipEndsAt?.toISOString() ?? null}
            />
          </div>
        </>
      )}
    </div>
  );
}

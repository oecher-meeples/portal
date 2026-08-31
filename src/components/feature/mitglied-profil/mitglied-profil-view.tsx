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
    meeple: (MeepleDatenMeeple & { displayName: string }) | null;
  };
  viewer: ProfileViewerContext;
}) {
  const isSelf = member.meepleId === viewer.currentMeepleId;
  const canRequestChange = isSelf || viewer.isGuardianOfTarget;

  const openStammdatenChanges = viewer.isAdmin
    ? await listOpenStammdatenChanges(member.id)
    : [];

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
        openChanges={openStammdatenChanges.map((change) => ({
          id: change.id,
          memberDisplayName: memberDisplayName(member),
          memberNumber: member.memberNumber,
          displayValue: formatStammdatenDiffSummary(change.fieldsJson),
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
    </div>
  );
}

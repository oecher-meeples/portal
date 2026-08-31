import type { Member } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { memberDisplayName } from "@/lib/members/member-display-name";
import type { ProfileViewerContext } from "@/lib/members/profile-access";
import {
  formatStammdatenDiffSummary,
  listOpenStammdatenChanges,
} from "@/lib/members/stammdaten";
import { StammdatenSection } from "@/components/feature/mitglied-profil/stammdaten-section";

/** Route-Einstieg für `/mitglied/[slug]` (#379 ff.) — setzt die einzelnen
 * Bereiche der Epic (#380–#385, #388, #389, #376) zusammen. Zugriffsschutz
 * läuft bereits vollständig in `page.tsx`/`profile-access.ts`. */
export async function MitgliedProfilView({
  member,
  viewer,
}: {
  member: Member & { meeple: { displayName: string } | null };
  viewer: ProfileViewerContext;
}) {
  const isSelf = member.meepleId === viewer.currentMeepleId;
  const canRequestChange = isSelf || viewer.isGuardianOfTarget;

  const openStammdatenChanges = viewer.isAdmin
    ? await listOpenStammdatenChanges(member.id)
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
    </div>
  );
}

import type { Member } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { memberDisplayName } from "@/lib/members/member-display-name";
import type { ProfileViewerContext } from "@/lib/members/profile-access";

/** Route-Einstieg für `/mitglied/[slug]` (#379) — die Seite selbst bleibt
 * ein leeres Gerüst, bis die einzelnen Bereiche (#380–#385, #388, #389,
 * #376) sie füllen. Zugriffsschutz läuft bereits vollständig in
 * `page.tsx`/`profile-access.ts`, hier nur noch die Anzeige. */
export function MitgliedProfilView({
  member,
  viewer,
}: {
  member: Member & { meeple: { displayName: string } | null };
  viewer: ProfileViewerContext;
}) {
  const isSelf = member.meepleId === viewer.currentMeepleId;

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
    </div>
  );
}

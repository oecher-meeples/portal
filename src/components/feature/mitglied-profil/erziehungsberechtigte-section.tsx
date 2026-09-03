import Link from "next/link";
import type { GuardianLinkOption } from "@/lib/members/guardians";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";

/** Erziehungsberechtigten-Sektion auf dem Kind-Profil (#385, Gegenstück zu
 * `MeineKinderSection`) — sichtbar für Vorstand (`isAdmin`/`canManageMembers`)
 * und für die verknüpften Erziehungsberechtigten selbst
 * (`viewer.isGuardianOfTarget`), NICHT für das MiniMeeple/JungMeeple selbst:
 * `mitglied-profil-view.tsx` lädt die Daten dafür nur außerhalb von `isSelf`. */
export function ErziehungsberechtigteSection({
  guardians,
}: {
  guardians: (GuardianLinkOption & { slug: string })[];
}) {
  if (guardians.length === 0) return null;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Erziehungsberechtigte</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {guardians.map((guardian) => (
          <li key={guardian.id} className="flex items-center gap-1.5">
            <MeepleAvatar
              name={guardian.displayName}
              profilePictureUrl={guardian.profilePictureUrl}
              profilePictureVisibility={guardian.profilePictureVisibility}
              viewer={{ kind: "meeple" }}
              size="sm"
            />
            <Link
              href={`/profil/${guardian.slug}`}
              className="text-primary underline underline-offset-2"
            >
              {guardian.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

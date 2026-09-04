import Link from "next/link";
import type { GuardianLinkOption } from "@/lib/members/guardians";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { ContactDialog } from "@/components/entities/contact-dialog";

/** "Meine Kinder"-Sektion (#376) — nur auf der eigenen Profilseite
 * eingebunden (`mitglied-profil-view.tsx` rendert sie nur, wenn
 * `slug === eigener Slug`); für niemand sonst sichtbar, auch nicht auf dem
 * Kind-Profil selbst oder in der allgemeinen Mitgliederverwaltung. */
export function MeineKinderSection({
  guardianChildren,
}: {
  guardianChildren: (GuardianLinkOption & { slug: string })[];
}) {
  if (guardianChildren.length === 0) return null;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Meine Kinder</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {guardianChildren.map((child) => (
          <li key={child.id} className="flex items-center gap-1.5">
            <MeepleAvatar
              name={child.displayName}
              profilePictureUrl={child.profilePictureUrl}
              profilePictureVisibility={child.profilePictureVisibility}
              viewer={{ kind: "meeple" }}
              size="md"
            />
            {child.meepleId ? (
              <ContactDialog
                name={child.displayName}
                meepleId={child.meepleId}
              />
            ) : (
              // Kein Meeple (MiniMeeple/JungMeeple ohne eigenen Login, #373)
              // — kein ContactDialog möglich, aber ein Profil unter
              // `/profil/<slug>` gibt es trotzdem (Member existiert ohne
              // Meeple, siehe ADR 0013).
              <Link
                href={`/profil/${child.slug}`}
                className="text-primary underline underline-offset-2"
              >
                {child.displayName}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

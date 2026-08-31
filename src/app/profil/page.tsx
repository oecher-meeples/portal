import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireMember } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";

/** `/profil` zeigt seit #386 keine eigene Implementierung mehr — es löst den
 * eigenen `Member.slug` auf und leitet auf `/mitglied/[slug]` weiter,
 * dieselbe Seite, die auch für andere Profile gilt (#379 ff.). */
export default async function ProfilPage() {
  const session = await requireMember();

  const ownMember = await prisma.member.findUnique({
    where: { meepleId: session.meeple.id },
    select: { slug: true },
  });

  if (!ownMember) {
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

  redirect(`/mitglied/${ownMember.slug}`);
}

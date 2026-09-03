import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import { NewsletterInlineSignup } from "@/components/feature/newsletter/newsletter-inline-signup";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";

export default async function NewsPage() {
  const [allItems, user, sessionTier] = await Promise.all([
    getAllContentWithCalendar(),
    getCurrentUser(),
    getSessionTier(),
  ]);
  // #10 (Folgefehler beim Live-Test): news:internal:view ist keine
  // Editier-Affordance, sondern eine reguläre Meeple-Berechtigung
  // (REGULAR_MEEPLE_PERMISSION_KEYS) — hasPermissionInCurrentView() ist laut
  // eigenem Vertrag nur für Admin-only-Affordances gedacht und lieferte in
  // der Admin-Vorschau "als Mitglied" pauschal false, obwohl ein echter
  // Mitglied-Account interne News standardmäßig sieht. sessionTier statt
  // hasPermissionInCurrentView respektiert die Vorschau (gast sieht nie
  // intern), das echte hasPermission() gilt für alle anderen Fälle
  // (inkl. z. B. eines Ausgetretenen, dem die Berechtigung entzogen ist).
  const canSeeInternal =
    user && sessionTier !== "gast"
      ? await hasPermission(user.id, "news:internal:view")
      : false;
  // #424: keine öffentlichen Umfragen — nur Meeple sind abstimmungsberechtigt,
  // unabhängig vom internal-Flag des einzelnen Posts. sessionTier statt der
  // bloßen Login-Prüfung, damit ein Admin in der Gäste-Vorschau
  // (getPreviewTier()) ebenfalls keine Umfragen sieht — die vorherige
  // `!!user`-Prüfung blieb für einen echten Admin auch im Gast-Preview wahr.
  const isMember = tierAtLeast(sessionTier, "mitglied");
  const items = allItems
    .filter((item) => canSeeInternal || !item.internal)
    .filter((item) => isMember || item.type !== "umfrage");
  const [canEditPublic, canEditInternal] = user
    ? await Promise.all([
        hasPermissionInCurrentView(user.id, "posts:public"),
        hasPermissionInCurrentView(user.id, "posts:internal"),
      ])
    : [false, false];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Newsroom"
        title="Termine & Blog"
        description="Alle Veranstaltungen, Turniere und Vereinsnews. Beiträge der Moderator:innen erscheinen automatisch auch auf Instagram."
        action={
          canEditPublic || canEditInternal ? (
            <Button
              render={<Link href="/admin/news/new">+ Neuer Beitrag</Link>}
            />
          ) : undefined
        }
      />
      <NewsletterInlineSignup />
      <NewsBrowser
        items={items}
        icsUrl={process.env.PUBLIC_CALENDAR_ICS_URL}
        canEditPublic={canEditPublic}
        canEditInternal={canEditInternal}
        canSeeInternal={canSeeInternal}
        canSeeSurveys={isMember}
      />
    </div>
  );
}

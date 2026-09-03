import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import { NewsletterInlineSignup } from "@/components/feature/newsletter/newsletter-inline-signup";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermissionInCurrentView } from "@/lib/auth/session";

export default async function NewsPage() {
  const [allItems, user] = await Promise.all([
    getAllContentWithCalendar(),
    getCurrentUser(),
  ]);
  const canSeeInternal = user
    ? await hasPermissionInCurrentView(user.id, "news:internal:view")
    : false;
  // #424: keine öffentlichen Umfragen — nur Meeple sind abstimmungsberechtigt,
  // unabhängig vom internal-Flag des einzelnen Posts.
  const items = allItems
    .filter((item) => canSeeInternal || !item.internal)
    .filter((item) => user || item.type !== "umfrage");
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
        canSeeSurveys={!!user}
      />
    </div>
  );
}

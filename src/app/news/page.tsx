import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NEWS_PAGE_SIZE } from "@/lib/content/content-types";
import {
  filterVisibleNews,
  resolveNewsVisibility,
} from "@/lib/content/news-visibility";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import { NewsletterInlineSignup } from "@/components/feature/newsletter/newsletter-inline-signup";
import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";

export default async function NewsPage() {
  const [{ items: rawItems, hasMore, nextCursor }, user, sessionTier] =
    await Promise.all([
      getAllContentWithCalendar({ take: NEWS_PAGE_SIZE }),
      getCurrentUser(),
      getSessionTier(),
    ]);
  const visibility = await resolveNewsVisibility(user, sessionTier);
  const items = filterVisibleNews(rawItems, visibility);
  const [canEditPublic, canEditInternal] = user
    ? await Promise.all([
        hasPermissionInCurrentView(user.id, "posts:public"),
        hasPermissionInCurrentView(user.id, "posts:internal"),
      ])
    : [false, false];

  return (
    <PageContainer>
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
        hasMore={hasMore}
        nextCursor={nextCursor}
        icsUrl={process.env.PUBLIC_CALENDAR_ICS_URL}
        canEditPublic={canEditPublic}
        canEditInternal={canEditInternal}
        canSeeInternal={visibility.canSeeInternal}
        canSeeSurveys={visibility.isMember}
      />
    </PageContainer>
  );
}

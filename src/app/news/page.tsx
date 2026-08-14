import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import { NewsletterInlineSignup } from "@/components/feature/newsletter/newsletter-inline-signup";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermissionInCurrentView, getSessionTier } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";

export default async function NewsPage() {
  const [allItems, user, sessionTier] = await Promise.all([
    getAllContentWithCalendar(),
    getCurrentUser(),
    getSessionTier(),
  ]);
  const canSeeInternal = tierAtLeast(sessionTier, "mitglied");
  const items = canSeeInternal
    ? allItems
    : allItems.filter((item) => !item.internal);
  const canEdit = user
    ? await hasPermissionInCurrentView(user.id, "posts:write")
    : false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Newsroom"
        title="Termine & Blog"
        description="Alle Veranstaltungen, Turniere und Vereinsnews. Beiträge der Moderator:innen erscheinen automatisch auch auf Instagram."
        action={
          canEdit ? (
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
        canEdit={canEdit}
        canSeeInternal={canSeeInternal}
      />
    </div>
  );
}

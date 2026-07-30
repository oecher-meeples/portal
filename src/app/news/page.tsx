import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermissionInCurrentView } from "@/lib/auth/session";

export default async function NewsPage() {
  const [publicItems, user] = await Promise.all([
    getAllContentWithCalendar().then((items) =>
      items.filter((item) => !item.internal),
    ),
    getCurrentUser(),
  ]);
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
      <NewsBrowser
        items={publicItems}
        icsUrl={process.env.PUBLIC_CALENDAR_ICS_URL}
        canEdit={canEdit}
      />
    </div>
  );
}

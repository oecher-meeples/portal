import { PageHeading } from "@/components/ui/page-heading";
import { getAllContentWithCalendar } from "@/lib/calendar";
import { NewsBrowser } from "@/components/feature/news/news-browser";

export default async function NewsPage() {
  const publicItems = (await getAllContentWithCalendar()).filter(
    (item) => !item.internal,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Newsroom"
        title="Termine & Blog"
        description="Alle Veranstaltungen, Turniere und Vereinsnews. Beiträge der Moderator:innen erscheinen automatisch auch auf Instagram."
      />
      <NewsBrowser
        items={publicItems}
        icsUrl={process.env.PUBLIC_CALENDAR_ICS_URL}
      />
    </div>
  );
}

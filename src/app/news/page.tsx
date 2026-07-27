import { PageHeading } from "@/components/shared/page-heading";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { CONTENT_ITEMS } from "@/data/content";
import { NewsFilter } from "@/app/news/news-filter";

export default function NewsPage() {
  const publicItems = CONTENT_ITEMS.filter((item) => !item.internal);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Newsroom"
        title="Termine & Blog"
        description="Alle Veranstaltungen, Turniere und Vereinsnews. Beiträge der Moderator:innen erscheinen automatisch auch auf Instagram."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <NewsFilter items={publicItems} />
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Google-Kalender</h2>
          <PlaceholderMedia label="KALENDER-SYNC" className="mt-3" />
          <p className="text-muted-foreground mt-3 text-sm">
            Automatisch synchronisiert aus dem öffentlichen Vereinskalender.
          </p>
        </div>
      </div>
    </div>
  );
}

import { requireMember } from "@/lib/auth/session";
import { getInternalCalendarEvents } from "@/lib/content/calendar";
import { PageHeading } from "@/components/ui/page-heading";
import { NewsBrowser } from "@/components/feature/news/news-browser";

export default async function InternalCalendarPage() {
  await requireMember();

  const items = await getInternalCalendarEvents();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Vereinskalender"
        description="Öffentliche und interne Termine zusammen — interne Termine sind mit Badge und Randfarbe abgesetzt."
      />
      <NewsBrowser items={items} />
    </div>
  );
}

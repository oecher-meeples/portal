import { requireAdminPermission } from "@/lib/auth/session";
import {
  findUpcomingEvents,
  resolveSelectedEventId,
} from "@/lib/events/upcoming";
import { ensureEventUnit } from "@/lib/ludothek/holdings";
import { EventScanPageView } from "@/components/feature/admin-bestand/event-scan-page-view";

export default async function EventAusgabePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  await requireAdminPermission("games:manage");
  const { event: requestedEventId } = await searchParams;

  const events = await findUpcomingEvents({
    id: true,
    title: true,
    slug: true,
  });
  const selectedEventId = resolveSelectedEventId(events, requestedEventId);
  const selectedEvent = events.find((event) => event.id === selectedEventId);

  const eventUnit = selectedEvent ? await ensureEventUnit(selectedEvent) : null;

  return (
    <EventScanPageView
      title="Event-Ausgabe"
      description="Event wählen, dann jedes Spiel beim Verladen scannen — landet vorerst grob auf dem Event-Sammel-Platz, ohne Regal-Bezug."
      basePath="/admin/bestand/event-ausgabe"
      events={events}
      selectedEventId={selectedEventId}
      targetUnitId={eventUnit?.id ?? null}
      targetLabel={selectedEvent?.title ?? ""}
    />
  );
}

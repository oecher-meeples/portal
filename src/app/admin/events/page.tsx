import { prisma } from "@/lib/utils/prisma";
import { requireAdmin } from "@/lib/auth/session";
import {
  AdminEventsView,
  type EventRow,
} from "@/components/feature/admin-events/admin-events-view";

export default async function AdminEventsPage() {
  await requireAdmin();

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { shifts: true } } },
  });

  const rows: EventRow[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    location: event.location,
    shiftCount: event._count.shifts,
  }));

  return <AdminEventsView events={rows} />;
}

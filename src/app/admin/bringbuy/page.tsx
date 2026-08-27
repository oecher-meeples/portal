import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import {
  findUpcomingEvents,
  resolveSelectedEventId,
} from "@/lib/events/upcoming";
import { hasRoleGrantedPermission } from "@/lib/events/shift-rights";
import { FLEA_MARKET_CASHIER_PERMISSION_KEY } from "@/components/feature/admin-bringbuy/cashier-actions";
import { computeFleaMarketStats } from "@/lib/bringbuy/stats";
import {
  AdminBringBuyView,
  type CashierEventOption,
  type CashierItem,
} from "@/components/feature/admin-bringbuy/admin-bringbuy-view";

export default async function AdminBringBuyPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { meeple } = await requireMember();
  const { event: requestedEventId } = await searchParams;

  const events = await findUpcomingEvents();
  const selectedEventId = resolveSelectedEventId(events, requestedEventId);

  if (!selectedEventId) {
    return (
      <AdminBringBuyView
        events={[]}
        selectedEventId=""
        stats={{ listed: 0, soldToday: 0, revenue: 0, reserved: 0 }}
        items={[]}
      />
    );
  }

  const allowed = await hasRoleGrantedPermission(
    meeple.id,
    FLEA_MARKET_CASHIER_PERMISSION_KEY,
  );
  if (!allowed) {
    redirect("/403");
  }

  const items = await prisma.fleaMarketItem.findMany({
    where: { eventId: selectedEventId },
    orderBy: { createdAt: "asc" },
    include: { seller: { select: { displayName: true } } },
  });

  const stats = computeFleaMarketStats(
    selectedEventId,
    items.map((item) => ({
      eventId: item.eventId,
      priceEuros: item.priceEuros,
      status: item.status,
      updatedAt: item.updatedAt,
    })),
  );

  const eventOptions: CashierEventOption[] = events.map((event) => ({
    id: event.id,
    title: event.title,
  }));

  const cashierItems: CashierItem[] = items.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    sellerName: item.seller.displayName,
    priceEuros: item.priceEuros,
    status: item.status,
  }));

  return (
    <AdminBringBuyView
      events={eventOptions}
      selectedEventId={selectedEventId}
      stats={stats}
      items={cashierItems}
    />
  );
}

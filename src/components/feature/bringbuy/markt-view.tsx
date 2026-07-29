import { prisma } from "@/lib/prisma";
import { requireMeeple } from "@/lib/meeples";
import { formatDate } from "@/lib/format";
import { CreateFleaMarketItemDialog } from "@/components/feature/bringbuy/create-flea-market-item-dialog";
import {
  OwnFleaMarketItemList,
  type OwnFleaMarketItem,
} from "@/components/feature/bringbuy/own-flea-market-item-list";

export async function FleaMarketSection() {
  const meeple = await requireMeeple();

  const [events, ownItems] = await Promise.all([
    prisma.event.findMany({
      where: { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true },
    }),
    prisma.fleaMarketItem.findMany({
      where: { sellerMeepleId: meeple.id },
      orderBy: { createdAt: "desc" },
      include: { event: { select: { title: true } } },
    }),
  ]);

  const eventOptions = events.map((event) => ({
    id: event.id,
    title: event.title,
    dateLabel: formatDate(event.startsAt.toISOString()),
  }));

  const items: OwnFleaMarketItem[] = ownItems.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    description: item.description,
    priceEuros: item.priceEuros,
    status: item.status,
    eventTitle: item.event.title,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">Bring &amp; Buy Flohmarkt</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Melde eigene Artikel für den Flohmarkt-Verkaufstag eines Events an. Sie
            müssen an der Flohmarkt-Kasse freigegeben werden, bevor sie im
            Gäste-Bereich sichtbar sind.
          </p>
        </div>
        <CreateFleaMarketItemDialog events={eventOptions} />
      </div>
      <OwnFleaMarketItemList items={items} />
    </div>
  );
}

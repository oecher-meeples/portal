import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { isBringAndBuyMarketOpen } from "@/lib/events/upcoming";
import {
  createOwnFleaMarketItem,
  listOwnFleaMarketItems,
  updateOwnFleaMarketItem,
} from "@/lib/bringbuy/own-items";
import { SellerDashboardView } from "@/components/feature/bringbuy/seller-dashboard-view";

/** Meeple-Verkäuferseite (#266) — kein Token nötig, die bestehende
 * Anmeldung identifiziert bereits eindeutig. */
export default async function MeepleSellerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { meeple } = await requireMember();
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !isBringAndBuyMarketOpen(event)) {
    notFound();
  }

  const items = await listOwnFleaMarketItems(event.id, {
    sellerMeepleId: meeple.id,
  });
  const sellerRef = { sellerMeepleId: meeple.id } as const;

  return (
    <SellerDashboardView
      eventTitle={event.title}
      sellerLabel={meeple.displayName}
      items={items}
      createItem={createOwnFleaMarketItem.bind(null, event.id, sellerRef)}
      updateItem={updateOwnFleaMarketItem.bind(null, sellerRef)}
    />
  );
}

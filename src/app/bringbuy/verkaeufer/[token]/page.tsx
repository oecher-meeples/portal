import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import {
  findExternalSellerByToken,
  listOwnFleaMarketItems,
} from "@/lib/bringbuy/queries";
import {
  createOwnFleaMarketItemWithToken,
  updateOwnFleaMarketItemWithToken,
} from "@/lib/bringbuy/own-items";
import { SellerDashboardView } from "@/components/feature/bringbuy/seller-dashboard-view";

export default async function ExternalSellerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const seller = await findExternalSellerByToken(token);
  if (!seller) {
    notFound();
  }

  const [event, items] = await Promise.all([
    prisma.event.findUnique({ where: { id: seller.eventId } }),
    listOwnFleaMarketItems(seller.eventId, {
      externalSellerId: seller.id,
    }),
  ]);
  if (!event) {
    notFound();
  }

  return (
    <SellerDashboardView
      eventTitle={event.title}
      sellerLabel={seller.name}
      items={items}
      createItem={createOwnFleaMarketItemWithToken.bind(null, token)}
      updateItem={updateOwnFleaMarketItemWithToken.bind(null, token)}
    />
  );
}

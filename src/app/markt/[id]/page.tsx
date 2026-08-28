import { notFound } from "next/navigation";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { toMarketListingView } from "@/lib/markt/market-listings";
import { MarketListingDetailView } from "@/components/feature/markt/market-listing-detail-view";

export default async function MarketListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, meeple } = await requireMember();
  const { id } = await params;

  const listing = await prisma.marketListing.findUnique({
    where: { id },
    include: { seller: true },
  });
  if (!listing) notFound();

  const canEdit =
    listing.sellerMeepleId === meeple.id ||
    (await hasPermissionInCurrentView(user.id, "admin:access"));

  return (
    <MarketListingDetailView
      listing={toMarketListingView(listing, listing.seller)}
      canEdit={canEdit}
    />
  );
}

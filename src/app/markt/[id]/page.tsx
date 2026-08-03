import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { toMarketListingView } from "@/lib/markt/market-listings";
import { MarketListingDetailView } from "@/components/feature/markt/market-listing-detail-view";

export default async function MarketListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMember();
  const { id } = await params;

  const listing = await prisma.marketListing.findUnique({
    where: { id },
    include: { seller: true },
  });
  if (!listing) notFound();

  return (
    <MarketListingDetailView
      listing={toMarketListingView(listing, listing.seller)}
    />
  );
}

import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { MARKET_LISTINGS, getMarketListing } from "@/data/market";
import { MarketListingMockView } from "@/components/feature/markt/market-listing-mock-view";

export function generateStaticParams() {
  return MARKET_LISTINGS.map((listing) => ({ id: listing.id }));
}

export default async function MarketListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMember();
  const { id } = await params;
  const listing = getMarketListing(id);
  if (!listing) notFound();

  return <MarketListingMockView listing={listing} />;
}

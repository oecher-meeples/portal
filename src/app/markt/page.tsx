import { requireMember } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/utils/prisma";
import { toSparePartListingView } from "@/lib/inventory/spare-parts";
import {
  filterMarketListings,
  parseMarketListingSearchParams,
  toMarketListingView,
} from "@/lib/markt/market-listings";
import { MarktBrowser } from "@/components/feature/markt/markt-browser";
import { FleaMarketSection } from "@/components/feature/bringbuy/markt-view";

export default async function MarktPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { meeple } = await requireMember();
  const filters = parseMarketListingSearchParams(await searchParams);

  const [marketListings, sparePartListings] = await Promise.all([
    prisma.marketListing.findMany({
      include: { seller: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sparePartListing.findMany({
      include: { keeper: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const listings = filterMarketListings(
    marketListings.map((listing) =>
      toMarketListingView(listing, listing.seller),
    ),
    filters,
  );
  const spareParts = sparePartListings.map((listing) =>
    toSparePartListingView(listing, listing.keeper),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Community-Handel"
        title="Marktplatz & Ersatzteillager"
        description="Interner Kleinanzeigen-Markt zwischen Mitgliedern – plus das Ausschlacht-Lager für einzelne Komponenten."
      />
      <MarktBrowser
        listings={listings}
        spareParts={spareParts}
        ownMeepleId={meeple.id}
      />
      <Separator />
      <FleaMarketSection />
    </div>
  );
}

import { requireMember } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/utils/prisma";
import { MARKET_LISTINGS } from "@/data/market";
import { toSparePartListingView } from "@/lib/inventory/spare-parts";
import { MarktBrowser } from "@/components/feature/markt/markt-browser";
import { FleaMarketSection } from "@/components/feature/bringbuy/markt-view";

export default async function MarktPage() {
  await requireMember();

  const sparePartListings = await prisma.sparePartListing.findMany({
    include: { keeper: true },
    orderBy: { createdAt: "desc" },
  });
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
      <MarktBrowser listings={MARKET_LISTINGS} spareParts={spareParts} />
      <Separator />
      <FleaMarketSection />
    </div>
  );
}

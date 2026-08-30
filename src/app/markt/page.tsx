import {
  requireAdminPermission,
  hasPermissionInCurrentView,
} from "@/lib/auth/session";
import { PageHeading } from "@/components/ui/page-heading";
import { prisma } from "@/lib/utils/prisma";
import { toSparePartListingView } from "@/lib/inventory/spare-parts";
import {
  filterMarketListings,
  parseMarketListingSearchParams,
  toMarketListingView,
} from "@/lib/markt/market-listings";
import { MarktBrowser } from "@/components/feature/markt/markt-browser";
import { MarketNewsletterToggle } from "@/components/widgets/market-newsletter-toggle";

export default async function MarktPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, meeple } = await requireAdminPermission("market:participate");
  const rawSearchParams = await searchParams;
  const filters = parseMarketListingSearchParams(rawSearchParams);
  const canManageSpareParts = await hasPermissionInCurrentView(
    user.id,
    "games:manage",
  );

  const [marketListings, sparePartListings] = await Promise.all([
    prisma.marketListing.findMany({
      include: {
        seller: true,
        boardGame: { select: { slug: true, bggId: true } },
      },
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
        action={
          <MarketNewsletterToggle
            initialEnabled={meeple.marketNewsletterOptIn}
          />
        }
      />
      <MarktBrowser
        listings={listings}
        spareParts={spareParts}
        ownMeepleId={meeple.id}
        canManageSpareParts={canManageSpareParts}
        bggUsername={meeple.bggUsername}
        basePath="/markt"
        rawSearchParams={rawSearchParams}
        search={filters.search ?? ""}
      />
    </div>
  );
}

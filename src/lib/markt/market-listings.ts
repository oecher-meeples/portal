import { firstString } from "@/lib/utils/search-params";
import { getContactLinks, type ContactLinks } from "@/lib/members/contact";

export type MarketListingView = {
  id: string;
  title: string;
  description: string | null;
  priceEuros: number;
  condition: string;
  imageUrls: string[];
  sellerMeepleId: string;
  sellerDisplayName: string;
  sellerContact: ContactLinks;
};

export function toMarketListingView(
  listing: {
    id: string;
    title: string;
    description: string | null;
    priceEuros: number;
    condition: string;
    imageUrls: string[];
    sellerMeepleId: string;
  },
  seller: {
    displayName: string;
    email: string | null;
    telegramHandle: string | null;
    signalHandle: string | null;
    discordHandle: string | null;
    address: string | null;
    shareAddress: boolean;
  },
): MarketListingView {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceEuros: listing.priceEuros,
    condition: listing.condition,
    imageUrls: listing.imageUrls,
    sellerMeepleId: listing.sellerMeepleId,
    sellerDisplayName: seller.displayName,
    sellerContact: getContactLinks(seller),
  };
}

export type MarketListingFilters = {
  maxPriceEuros?: number;
  condition?: string;
};

/** Turns a Next.js `searchParams` object into filters — the single source of truth for URLs. */
export function parseMarketListingSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): MarketListingFilters {
  const maxPriceRaw = firstString(searchParams.preis);
  const condition = firstString(searchParams.zustand);

  return {
    maxPriceEuros:
      maxPriceRaw && !Number.isNaN(Number(maxPriceRaw))
        ? Number(maxPriceRaw)
        : undefined,
    condition: condition || undefined,
  };
}

export function filterMarketListings(
  listings: MarketListingView[],
  filters: MarketListingFilters,
): MarketListingView[] {
  return listings.filter((listing) => {
    if (
      filters.maxPriceEuros !== undefined &&
      listing.priceEuros > filters.maxPriceEuros
    ) {
      return false;
    }
    if (filters.condition && listing.condition !== filters.condition) {
      return false;
    }
    return true;
  });
}

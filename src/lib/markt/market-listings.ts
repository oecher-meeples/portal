import type { ProfilePictureVisibility } from "@prisma/client";
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
  /** (#412) Verkäufer:in-Profilbild — Markt ist member-only
   * (`market:participate`), Viewer ist daher immer "meeple". */
  sellerProfilePictureUrl: string | null;
  sellerProfilePictureVisibility: ProfilePictureVisibility;
  /** Link zum Inventar-Titel (#278), `null` bei frei angelegten Anzeigen —
   * trägt den BGG-Link/Slug bereits über den `BoardGame`-Datensatz. */
  boardGame: { slug: string; bggId: number | null } | null;
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
    boardGame: { slug: string; bggId: number | null } | null;
  },
  seller: {
    displayName: string;
    email: string | null;
    telegramHandle: string | null;
    signalHandle: string | null;
    discordHandle: string | null;
    address: string | null;
    shareAddress: boolean;
    profilePictureUrl: string | null;
    profilePictureVisibility: ProfilePictureVisibility;
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
    sellerProfilePictureUrl: seller.profilePictureUrl,
    sellerProfilePictureVisibility: seller.profilePictureVisibility,
    boardGame: listing.boardGame,
  };
}

export type MarketListingFilters = {
  maxPriceEuros?: number;
  condition?: string;
  /** Freitext-Titelsuche (`?suche=`, #278-Folge) — verlinkt z. B. von der
   * Titel-Detailseite aus auf alle Anzeigen eines Spiels statt nur die
   * zuletzt angelegte. */
  search?: string;
};

/** Turns a Next.js `searchParams` object into filters — the single source of truth for URLs. */
export function parseMarketListingSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): MarketListingFilters {
  const maxPriceRaw = firstString(searchParams.preis);
  const condition = firstString(searchParams.zustand);
  const search = firstString(searchParams.suche);

  return {
    maxPriceEuros:
      maxPriceRaw && !Number.isNaN(Number(maxPriceRaw))
        ? Number(maxPriceRaw)
        : undefined,
    condition: condition || undefined,
    search: search || undefined,
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
    if (
      filters.search &&
      !listing.title.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

import { getContactLinks, type ContactLinks } from "@/lib/members/contact";

export type SparePartListingView = {
  id: string;
  title: string;
  condition: string;
  description: string | null;
  keeperMeepleId: string;
  keeperDisplayName: string;
  keeperContact: ContactLinks;
};

export function toSparePartListingView(
  listing: {
    id: string;
    title: string;
    condition: string;
    description: string | null;
    keeperMeepleId: string;
  },
  keeper: {
    displayName: string;
    email: string | null;
    telegramHandle: string | null;
    signalHandle: string | null;
    discordHandle: string | null;
    address: string | null;
    shareAddress: boolean;
  },
): SparePartListingView {
  return {
    id: listing.id,
    title: listing.title,
    condition: listing.condition,
    description: listing.description,
    keeperMeepleId: listing.keeperMeepleId,
    keeperDisplayName: keeper.displayName,
    keeperContact: getContactLinks(keeper),
  };
}

import type { ProfilePictureVisibility } from "@prisma/client";
import { getContactLinks, type ContactLinks } from "@/lib/members/contact";

export type SparePartListingView = {
  id: string;
  title: string;
  condition: string;
  description: string | null;
  keeperMeepleId: string;
  keeperDisplayName: string;
  keeperContact: ContactLinks;
  /** (#412) Verwalter:in-Profilbild — Ersatzteillager ist member-only
   * (`market:participate`), Viewer ist daher immer "meeple". */
  keeperProfilePictureUrl: string | null;
  keeperProfilePictureVisibility: ProfilePictureVisibility;
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
    profilePictureUrl: string | null;
    profilePictureVisibility: ProfilePictureVisibility;
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
    keeperProfilePictureUrl: keeper.profilePictureUrl,
    keeperProfilePictureVisibility: keeper.profilePictureVisibility,
  };
}

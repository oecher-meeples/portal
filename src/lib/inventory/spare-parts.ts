import type { ProfilePictureVisibility } from "@prisma/client";
import {
  toContactDialogMeeple,
  type ContactDialogMeeple,
} from "@/lib/members/contact";

export type SparePartListingView = {
  id: string;
  title: string;
  condition: string;
  description: string | null;
  keeperMeepleId: string;
  keeperDisplayName: string;
  /** (#412) Ersatzteillager ist member-only (`market:participate`), Viewer
   * ist daher immer "meeple". */
  keeperContactMeeple: ContactDialogMeeple;
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
    member?: { slug: string } | null;
  },
): SparePartListingView {
  return {
    id: listing.id,
    title: listing.title,
    condition: listing.condition,
    description: listing.description,
    keeperMeepleId: listing.keeperMeepleId,
    keeperDisplayName: keeper.displayName,
    keeperContactMeeple: toContactDialogMeeple(keeper, { kind: "meeple" }),
  };
}

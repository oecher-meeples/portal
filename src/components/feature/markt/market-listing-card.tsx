"use client";

import Link from "next/link";
import { CoverMedia } from "@/components/ui/cover-media";
import { ActionButton } from "@/components/ui/action-button";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { EditMarketListingDialog } from "@/components/feature/markt/edit-market-listing-dialog";
import { deleteOwnMarketListing } from "@/components/feature/markt/actions";
import type { MarketListingView } from "@/lib/markt/market-listings";

export function MarketListingCard({
  listing,
  isOwn,
}: {
  listing: MarketListingView;
  isOwn: boolean;
}) {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <Link href={`/markt/${listing.id}`}>
        <CoverMedia
          imageUrl={listing.imageUrls[0] ?? null}
          alt={listing.title}
          label="FOTO"
          fit="contain"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/markt/${listing.id}`}
            className="hover:text-primary font-serif font-semibold"
          >
            {listing.title}
          </Link>
          <span className="text-primary shrink-0 font-serif font-bold">
            {listing.priceEuros} €
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Zustand: {listing.condition} · von{" "}
          <ContactDialog
            name={listing.sellerDisplayName}
            contact={listing.sellerContact}
          />
        </p>
        {isOwn && (
          <div className="mt-2 flex gap-2">
            <EditMarketListingDialog listing={listing} />
            <ActionButton
              variant="ghost"
              size="sm"
              confirm="Diese Anzeige wirklich löschen?"
              action={() => deleteOwnMarketListing(listing.id)}
            >
              Löschen
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}

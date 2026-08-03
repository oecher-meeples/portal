"use client";

import Link from "next/link";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
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
        <PlaceholderMedia label="FOTO" />
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
          Zustand: {listing.condition} · von {listing.sellerDisplayName}
        </p>
        {isOwn ? (
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
        ) : (
          listing.sellerContact.mailHref && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              render={
                <a href={listing.sellerContact.mailHref}>
                  ✉️ Verkäufer kontaktieren
                </a>
              }
            />
          )
        )}
      </div>
    </div>
  );
}

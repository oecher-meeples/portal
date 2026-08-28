"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CoverMedia } from "@/components/ui/cover-media";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { EditMarketListingDialog } from "@/components/feature/markt/edit-market-listing-dialog";
import type { MarketListingView } from "@/lib/markt/market-listings";

export function MarketListingDetailView({
  listing,
  canEdit = false,
}: {
  listing: MarketListingView;
  canEdit?: boolean;
}) {
  const images = listing.imageUrls.length > 0 ? listing.imageUrls : null;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {listing.boardGame && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/ludothek/${listing.boardGame.slug}`} />}
          >
            Zum Spiel
          </Button>
          {listing.boardGame.bggId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Auf BoardGameGeek ansehen"
              render={
                <a
                  href={`https://boardgamegeek.com/boardgame/${listing.boardGame.bggId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- statisches Logo aus public/, keine Optimierung nötig */}
              <img src="/bgg-logo.svg" alt="" className="h-4 w-auto" />
              <ExternalLink className="size-4" />
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => images && setLightboxUrl(images[0])}
            disabled={!images}
            className="text-left"
          >
            <CoverMedia
              imageUrl={images?.[0] ?? null}
              alt={listing.title}
              label="FOTO"
              aspect="aspect-square"
              fit="contain"
            />
          </button>
          {images && images.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {images.slice(1).map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxUrl(url)}
                >
                  <CoverMedia
                    imageUrl={url}
                    alt={listing.title}
                    aspect="aspect-square"
                    fit="contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-2xl font-bold">{listing.title}</h1>
            <span className="text-primary shrink-0 font-serif text-2xl font-bold">
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
          {listing.description && (
            <p className="leading-relaxed">{listing.description}</p>
          )}
          {canEdit && (
            <div className="mt-2">
              <EditMarketListingDialog listing={listing} />
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={lightboxUrl !== null}
        onOpenChange={(open) => !open && setLightboxUrl(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="sr-only">{listing.title}</DialogTitle>
          {lightboxUrl && (
            <CoverMedia
              imageUrl={lightboxUrl}
              alt={listing.title}
              fit="contain"
              sizing="natural"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

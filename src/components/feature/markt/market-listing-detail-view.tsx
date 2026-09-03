"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { CoverMedia } from "@/components/ui/cover-media";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { EditMarketListingDialog } from "@/components/feature/markt/edit-market-listing-dialog";
import { cn } from "@/lib/utils/cn";
import type { MarketListingView } from "@/lib/markt/market-listings";
import { PageContainer } from "@/components/ui/page-container";

export function MarketListingDetailView({
  listing,
  canEdit = false,
}: {
  listing: MarketListingView;
  canEdit?: boolean;
}) {
  const images = listing.imageUrls.length > 0 ? listing.imageUrls : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function showPreviousImage() {
    if (!images || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  }

  function showNextImage() {
    if (!images || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  }

  return (
    <PageContainer className="max-w-3xl gap-4">
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
            onClick={() => images && setLightboxIndex(0)}
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
              {images.slice(1).map((url, offset) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxIndex(offset + 1)}
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
              avatar={{
                profilePictureUrl: listing.sellerProfilePictureUrl,
                profilePictureVisibility:
                  listing.sellerProfilePictureVisibility,
                viewer: { kind: "meeple" },
              }}
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
        open={lightboxIndex !== null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">{listing.title}</DialogTitle>
          {images && lightboxIndex !== null && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {images.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Vorheriges Bild"
                    onClick={showPreviousImage}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                )}
                <CoverMedia
                  imageUrl={images[lightboxIndex]}
                  alt={listing.title}
                  fit="contain"
                  sizing="natural"
                  className="min-w-0 flex-1"
                />
                {images.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Nächstes Bild"
                    onClick={showNextImage}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`Bild ${index + 1} anzeigen`}
                      onClick={() => setLightboxIndex(index)}
                      className={cn(
                        "size-14 shrink-0 overflow-hidden rounded-md border-2",
                        index === lightboxIndex
                          ? "border-primary"
                          : "border-transparent",
                      )}
                    >
                      <CoverMedia
                        imageUrl={url}
                        alt=""
                        aspect="aspect-square"
                        fit="cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

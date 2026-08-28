import { CoverMedia } from "@/components/ui/cover-media";
import { ContactDialog } from "@/components/entities/contact-dialog";
import type { MarketListingView } from "@/lib/markt/market-listings";

export function MarketListingDetailView({
  listing,
}: {
  listing: MarketListingView;
}) {
  const images = listing.imageUrls.length > 0 ? listing.imageUrls : null;

  return (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <CoverMedia
          imageUrl={images?.[0] ?? null}
          alt={listing.title}
          label="FOTO"
          aspect="aspect-square"
          fit="contain"
        />
        {images && images.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(1).map((url) => (
              <CoverMedia
                key={url}
                imageUrl={url}
                alt={listing.title}
                aspect="aspect-square"
                fit="contain"
              />
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
      </div>
    </div>
  );
}

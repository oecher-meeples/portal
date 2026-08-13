import { PlaceholderMedia } from "@/components/ui/placeholder-media";
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
        {images ? (
          // eslint-disable-next-line @next/next/no-img-element -- external blob storage urls
          <img
            src={images[0]}
            alt={listing.title}
            className="aspect-square w-full rounded-md border object-cover"
          />
        ) : (
          <PlaceholderMedia label="FOTO" aspect="aspect-square" />
        )}
        {images && images.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- external blob storage urls
              <img
                key={url}
                src={url}
                alt={listing.title}
                className="aspect-square w-full rounded-md border object-cover"
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

import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { Button } from "@/components/ui/button";
import type { MarketListing } from "@/data/market";

type MarketListingMockViewProps = {
  listing: MarketListing;
};

export function MarketListingMockView({ listing }: MarketListingMockViewProps) {
  return (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <PlaceholderMedia label="FOTO" aspect="aspect-square" />
        <div className="grid grid-cols-3 gap-2">
          <PlaceholderMedia label="FOTO" aspect="aspect-square" />
          <PlaceholderMedia label="FOTO" aspect="aspect-square" />
          <PlaceholderMedia label="FOTO" aspect="aspect-square" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold">{listing.title}</h1>
          <span className="text-primary shrink-0 font-serif text-2xl font-bold">
            {listing.price} €
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Zustand: {listing.condition} · von {listing.seller}
        </p>
        <p className="leading-relaxed">{listing.description}</p>
        <Button className="mt-2 gap-1.5">✉️ Verkäufer kontaktieren</Button>
      </div>
    </div>
  );
}

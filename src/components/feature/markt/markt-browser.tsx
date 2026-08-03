"use client";

import { useState } from "react";
import Link from "next/link";
import { PillToggle } from "@/components/ui/pill-toggle";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { Button } from "@/components/ui/button";
import type { MarketListing } from "@/data/market";
import type { SparePartListingView } from "@/lib/inventory/spare-parts";
import { SparePartListingCard } from "@/components/feature/markt/spare-part-listing-view";

const TABS = [
  { label: "Kleinanzeigen", value: "kleinanzeigen" },
  { label: "Ersatzteillager", value: "ersatzteile" },
] as const;

export function MarktBrowser({
  listings,
  spareParts,
}: {
  listings: MarketListing[];
  spareParts: SparePartListingView[];
}) {
  const [tab, setTab] =
    useState<(typeof TABS)[number]["value"]>("kleinanzeigen");

  return (
    <div className="flex flex-col gap-5">
      <PillToggle options={[...TABS]} value={tab} onChange={setTab} />

      {tab === "kleinanzeigen" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-card flex flex-col overflow-hidden rounded-lg border"
            >
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
                    {listing.price} €
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Zustand: {listing.condition} · von {listing.seller}
                </p>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                  ✉️ Verkäufer kontaktieren
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spareParts.map((part) => (
            <SparePartListingCard key={part.id} part={part} />
          ))}
          {spareParts.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aktuell keine Einträge im Ersatzteillager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

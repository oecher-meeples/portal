"use client";

import { useState } from "react";
import { PillToggle } from "@/components/ui/pill-toggle";
import type { MarketListingView } from "@/lib/markt/market-listings";
import type { SparePartListingView } from "@/lib/inventory/spare-parts";
import { SparePartListingCard } from "@/components/feature/markt/spare-part-listing-view";
import { MarketListingCard } from "@/components/feature/markt/market-listing-card";
import { CreateMarketListingDialog } from "@/components/feature/markt/create-market-listing-dialog";

const TABS = [
  { label: "Kleinanzeigen", value: "kleinanzeigen" },
  { label: "Ersatzteillager", value: "ersatzteile" },
] as const;

export function MarktBrowser({
  listings,
  spareParts,
  ownMeepleId,
}: {
  listings: MarketListingView[];
  spareParts: SparePartListingView[];
  ownMeepleId: string;
}) {
  const [tab, setTab] =
    useState<(typeof TABS)[number]["value"]>("kleinanzeigen");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <PillToggle options={[...TABS]} value={tab} onChange={setTab} />
        {tab === "kleinanzeigen" && <CreateMarketListingDialog />}
      </div>

      {tab === "kleinanzeigen" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <MarketListingCard
              key={listing.id}
              listing={listing}
              isOwn={listing.sellerMeepleId === ownMeepleId}
            />
          ))}
          {listings.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aktuell keine Kleinanzeigen.
            </p>
          )}
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

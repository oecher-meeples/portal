"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PillToggle } from "@/components/ui/pill-toggle";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { buildHref } from "@/lib/utils/query-string";
import type { MarketListingView } from "@/lib/markt/market-listings";
import type { SparePartListingView } from "@/lib/inventory/spare-parts";
import { SparePartListingCard } from "@/components/feature/markt/spare-part-listing-view";
import { MarketListingCard } from "@/components/feature/markt/market-listing-card";
import { CreateMarketListingDialog } from "@/components/feature/markt/create-market-listing-dialog";
import { CreateSparePartListingDialog } from "@/components/feature/markt/create-spare-part-listing-dialog";
import { ImportBggListingDialog } from "@/components/feature/markt/import-bgg-listing-dialog";

const TABS = [
  { label: "Kleinanzeigen", value: "kleinanzeigen" },
  { label: "Ersatzteillager", value: "ersatzteile" },
] as const;

// `auto-fit`/`minmax` statt fester `sm:`/`lg:`-Spaltenzahl: die Karten
// bleiben lesbar breit und die Spaltenzahl wächst von selbst mit, statt auf
// sehr großen Displays bei 3 Spalten zu verharren (Feedback aus der Praxis).
const LISTING_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4";

export function MarktBrowser({
  listings,
  spareParts,
  ownMeepleId,
  canManageSpareParts,
  bggUsername,
  basePath,
  rawSearchParams,
  search: initialSearch,
}: {
  listings: MarketListingView[];
  spareParts: SparePartListingView[];
  ownMeepleId: string;
  canManageSpareParts: boolean;
  bggUsername: string | null;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  /** Vorbefüllte Titelsuche aus der URL (`?suche=`, #278-Folge) — z. B. per
   * Link von der Titel-Detailseite aus vorausgefüllt. */
  search: string;
}) {
  const [tab, setTab] =
    useState<(typeof TABS)[number]["value"]>("kleinanzeigen");
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch === initialSearch) return;
    router.replace(
      buildHref(basePath, rawSearchParams, {
        suche: debouncedSearch || undefined,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value settling
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <PillToggle options={[...TABS]} value={tab} onChange={setTab} />
        {tab === "kleinanzeigen" && (
          <div className="relative w-96 max-w-full">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Anzeigen durchsuchen …"
              className={search ? "pr-8" : undefined}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Suche leeren"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        {tab === "kleinanzeigen" && (
          <div className="ml-auto flex gap-2">
            {bggUsername && (
              <ImportBggListingDialog
                ownListingTitles={listings
                  .filter((listing) => listing.sellerMeepleId === ownMeepleId)
                  .map((listing) => listing.title)}
              />
            )}
            <CreateMarketListingDialog />
          </div>
        )}
        {tab === "ersatzteile" && (
          <div className="ml-auto">
            <CreateSparePartListingDialog />
          </div>
        )}
      </div>

      {tab === "kleinanzeigen" ? (
        <div className={LISTING_GRID_CLASS}>
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
        <div className={LISTING_GRID_CLASS}>
          {spareParts.map((part) => (
            <SparePartListingCard
              key={part.id}
              part={part}
              canManage={
                canManageSpareParts || part.keeperMeepleId === ownMeepleId
              }
            />
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

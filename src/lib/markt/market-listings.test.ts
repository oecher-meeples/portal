import { describe, expect, it } from "vitest";
import {
  filterMarketListings,
  parseMarketListingSearchParams,
  toMarketListingView,
  type MarketListingView,
} from "./market-listings";

describe("toMarketListingView", () => {
  it("resolves the seller's display name and contact links", () => {
    const view = toMarketListingView(
      {
        id: "listing-1",
        title: "Catan – Seefahrer",
        description: "Vollständig.",
        priceEuros: 12,
        condition: "Sehr gut",
        imageUrls: ["https://blob.example/a.png"],
        sellerMeepleId: "meeple-1",
      },
      { displayName: "Jan", email: "jan@example.com", telegramHandle: null },
    );

    expect(view).toEqual({
      id: "listing-1",
      title: "Catan – Seefahrer",
      description: "Vollständig.",
      priceEuros: 12,
      condition: "Sehr gut",
      imageUrls: ["https://blob.example/a.png"],
      sellerMeepleId: "meeple-1",
      sellerDisplayName: "Jan",
      sellerContact: { mailHref: "mailto:jan@example.com", telegramHref: null },
    });
  });
});

function listing(overrides: Partial<MarketListingView> = {}): MarketListingView {
  return {
    id: "listing-1",
    title: "Catan – Seefahrer",
    description: null,
    priceEuros: 12,
    condition: "Sehr gut",
    imageUrls: [],
    sellerMeepleId: "meeple-1",
    sellerDisplayName: "Jan",
    sellerContact: { mailHref: "mailto:jan@example.com", telegramHref: null },
    ...overrides,
  };
}

describe("parseMarketListingSearchParams", () => {
  it("parses a valid price and condition", () => {
    expect(
      parseMarketListingSearchParams({ preis: "20", zustand: "Neu" }),
    ).toEqual({ maxPriceEuros: 20, condition: "Neu" });
  });

  it("ignores a non-numeric price", () => {
    expect(parseMarketListingSearchParams({ preis: "abc" })).toEqual({
      maxPriceEuros: undefined,
      condition: undefined,
    });
  });

  it("returns undefined filters when nothing is set", () => {
    expect(parseMarketListingSearchParams({})).toEqual({
      maxPriceEuros: undefined,
      condition: undefined,
    });
  });
});

describe("filterMarketListings", () => {
  const listings = [
    listing({ id: "cheap", priceEuros: 5, condition: "Gebraucht" }),
    listing({ id: "expensive", priceEuros: 50, condition: "Neu" }),
  ];

  it("filters by max price", () => {
    expect(filterMarketListings(listings, { maxPriceEuros: 10 })).toEqual([
      listings[0],
    ]);
  });

  it("filters by condition", () => {
    expect(filterMarketListings(listings, { condition: "Neu" })).toEqual([
      listings[1],
    ]);
  });

  it("returns everything when no filter is set", () => {
    expect(filterMarketListings(listings, {})).toEqual(listings);
  });
});

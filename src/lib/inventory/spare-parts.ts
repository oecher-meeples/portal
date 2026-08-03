export type SparePartListingView = {
  id: string;
  title: string;
  condition: string;
  description: string | null;
  keeperDisplayName: string;
};

export function toSparePartListingView(
  listing: {
    id: string;
    title: string;
    condition: string;
    description: string | null;
  },
  keeper: { displayName: string },
): SparePartListingView {
  return {
    id: listing.id,
    title: listing.title,
    condition: listing.condition,
    description: listing.description,
    keeperDisplayName: keeper.displayName,
  };
}

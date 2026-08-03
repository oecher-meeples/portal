import { describe, expect, it } from "vitest";
import { toSparePartListingView } from "./spare-parts";

describe("toSparePartListingView", () => {
  it("resolves the keeper's display name", () => {
    const view = toSparePartListingView(
      {
        id: "listing-1",
        title: "Agricola (Ausschlachtung)",
        condition: "beschädigt",
        description: "Tableaus und Holzressourcen zur Weiterverwendung.",
      },
      { displayName: "Jan" },
    );

    expect(view).toEqual({
      id: "listing-1",
      title: "Agricola (Ausschlachtung)",
      condition: "beschädigt",
      description: "Tableaus und Holzressourcen zur Weiterverwendung.",
      keeperDisplayName: "Jan",
    });
  });

  it("leaves the 'Allgemeines' title unchanged when there is no board game reference", () => {
    const view = toSparePartListingView(
      {
        id: "listing-2",
        title: "Allgemeines",
        condition: "gemischt",
        description: null,
      },
      { displayName: "Verein" },
    );

    expect(view.title).toBe("Allgemeines");
    expect(view.description).toBeNull();
  });
});

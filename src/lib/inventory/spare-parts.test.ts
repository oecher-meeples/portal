import { describe, expect, it } from "vitest";
import { toSparePartListingView } from "./spare-parts";

const KEEPER = {
  displayName: "Jan",
  email: "jan@example.com",
  telegramHandle: null,
  signalHandle: null,
  discordHandle: null,
  address: null,
  shareAddress: false,
};

describe("toSparePartListingView", () => {
  it("resolves the keeper's display name and contact links", () => {
    const view = toSparePartListingView(
      {
        id: "listing-1",
        title: "Agricola (Ausschlachtung)",
        condition: "beschädigt",
        description: "Tableaus und Holzressourcen zur Weiterverwendung.",
        keeperMeepleId: "meeple-1",
      },
      KEEPER,
    );

    expect(view).toEqual({
      id: "listing-1",
      title: "Agricola (Ausschlachtung)",
      condition: "beschädigt",
      description: "Tableaus und Holzressourcen zur Weiterverwendung.",
      keeperMeepleId: "meeple-1",
      keeperDisplayName: "Jan",
      keeperContact: {
        mailHref: "mailto:jan@example.com",
        telegramHref: null,
        signalHref: null,
        discordHandle: null,
        address: null,
      },
    });
  });

  it("leaves the 'Allgemeines' title unchanged when there is no board game reference", () => {
    const view = toSparePartListingView(
      {
        id: "listing-2",
        title: "Allgemeines",
        condition: "gemischt",
        description: null,
        keeperMeepleId: "meeple-1",
      },
      KEEPER,
    );

    expect(view.title).toBe("Allgemeines");
    expect(view.description).toBeNull();
  });
});

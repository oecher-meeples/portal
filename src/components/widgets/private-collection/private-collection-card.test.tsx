import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivateCollectionCard } from "@/components/widgets/private-collection/private-collection-card";
import type { OwnPrivateCollectionEntry } from "@/lib/ludothek/private-collection";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/ludothek/private-collection-sync", () => ({
  syncPrivateBggCollection: vi.fn(),
}));

// #122: zieht sonst requireMeeple() und damit die serverseitige
// Auth-Kette in den Komponententest.
vi.mock(
  "@/components/widgets/private-collection/private-collection-actions",
  () => ({
    offerPrivateGameForEventAction: vi.fn(),
    withdrawPrivateGameOfferAction: vi.fn(),
  }),
);

function entry(
  overrides: Partial<OwnPrivateCollectionEntry> = {},
): OwnPrivateCollectionEntry {
  return {
    id: "entry-1",
    rating: null,
    forTrade: false,
    wantToPlay: false,
    boardGame: {
      id: "bg-1",
      slug: "ark-nova",
      title: "Ark Nova",
      imageUrl: null,
    },
    ...overrides,
  };
}

describe("PrivateCollectionCard (#308)", () => {
  it("links each title to its Ludothek detail page, with a link icon", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Aus BGG importiert/ }),
    );

    const link = screen.getByRole("link", { name: /Ark Nova/ });
    expect(link).toHaveAttribute("href", "/ludothek/ark-nova");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it("opens the dialog when clicking anywhere on the card (#Live-Review F9)", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );

    await user.click(screen.getByText("Meine privaten Spiele"));

    expect(
      screen.getByRole("heading", { name: "Meine privaten Spiele (1)" }),
    ).toBeInTheDocument();
  });

  it("does not open the dialog when clicking the import button (#Live-Review F9)", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername="erika"
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "BGG-Collection importieren" }),
    );

    expect(
      screen.queryByRole("heading", { name: /Meine privaten Spiele \(/ }),
    ).not.toBeInTheDocument();
  });

  it("has no click/hover affordance on the card without any entries (#Live-Review F9)", () => {
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("PrivateCollectionCard — Event-Freigabe (#122)", () => {
  const NEXT_EVENT = { id: "event-1", title: "Spieleabend Oktober" };

  it("shows no offer control without an upcoming event", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
      />,
    );
    await user.click(screen.getByText("Meine privaten Spiele"));

    expect(
      screen.queryByRole("button", { name: /zur Ausleihe freigeben/ }),
    ).not.toBeInTheDocument();
  });

  it("offers a not-yet-offered title for the next event", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
        nextEvent={NEXT_EVENT}
        ownOffers={[]}
      />,
    );
    await user.click(screen.getByText("Meine privaten Spiele"));

    expect(
      screen.getByRole("button", {
        name: 'Für "Spieleabend Oktober" zur Ausleihe freigeben',
      }),
    ).toBeInTheDocument();
  });

  it("offers withdrawal for an already-offered title", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
        nextEvent={NEXT_EVENT}
        ownOffers={[{ id: "loan-1", boardGameId: "bg-1", status: "OFFERED" }]}
      />,
    );
    await user.click(screen.getByText("Meine privaten Spiele"));

    expect(
      screen.getByRole("button", {
        name: 'Freigabe für "Spieleabend Oktober" zurückziehen',
      }),
    ).toBeInTheDocument();
  });

  it("shows a loaned pill instead of a control once issued", async () => {
    const user = userEvent.setup();
    render(
      <PrivateCollectionCard
        bggUsername={null}
        entries={[entry()]}
        cooldownEndsAt={null}
        canForceImport={false}
        visibleToOthers={true}
        nextEvent={NEXT_EVENT}
        ownOffers={[{ id: "loan-1", boardGameId: "bg-1", status: "LOANED" }]}
      />,
    );
    await user.click(screen.getByText("Meine privaten Spiele"));

    expect(
      screen.getByText("Ausgeliehen (Spieleabend Oktober)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /zurückziehen|freigeben/ }),
    ).not.toBeInTheDocument();
  });
});

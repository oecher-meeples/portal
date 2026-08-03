import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
}));

const { LudothekBrowser } = await import("./ludothek-browser");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PRIVATE_RESULT = {
  id: "entry-1",
  title: "Dune: Imperium",
  imageUrl: null,
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 60,
  ownerMeepleId: "meeple-1",
  ownerDisplayName: "Lea Demo",
};

function baseProps() {
  return {
    games: [],
    basePath: "/ludothek",
    rawSearchParams: {},
    filters: {},
    mechanicsOptions: [],
  };
}

describe("LudothekBrowser — private collection leak prevention", () => {
  it("never renders private collection results in the guest (public) view, even if passed by mistake", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.queryByText("Dune: Imperium")).not.toBeInTheDocument();
    expect(screen.queryByText(/im Privatbesitz von/)).not.toBeInTheDocument();
  });

  it("renders nothing when the toggle is off, even internally", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal
        filters={{ showPrivateCollection: false }}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.queryByText("Dune: Imperium")).not.toBeInTheDocument();
  });

  it("renders the owner hint when internal and the toggle is on", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal
        filters={{ showPrivateCollection: true }}
        privateCollectionResults={[PRIVATE_RESULT]}
      />,
    );

    expect(screen.getByText("Dune: Imperium")).toBeInTheDocument();
    expect(screen.getByText(/im Privatbesitz von Lea Demo/)).toBeInTheDocument();
  });
});

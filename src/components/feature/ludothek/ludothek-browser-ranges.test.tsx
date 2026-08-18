import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Split out of ludothek-browser.test.tsx (#214-Folge) — the Erstveröffentlichung/
// Bewertung/Spieler/Dauer slider tests pushed the original file past the
// 400-line limit. Mocks mirrored from there.
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
}));
const routerReplaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
}));
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: () => null,
}));
vi.mock("@/components/widgets/board-game/create-board-game-dialog", () => ({
  CreateBoardGameDialog: () => null,
}));

const { LudothekBrowser } = await import("./ludothek-browser");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function baseProps() {
  return {
    games: [],
    basePath: "/ludothek",
    rawSearchParams: {},
    filters: {},
    mechanicsOptions: [],
  };
}

describe("LudothekBrowser — Erstveröffentlichung von/bis (#205, Slider seit #214-Folge)", () => {
  it("commits a jahrVon change to the router immediately (native range 'change' = commit)", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    fireEvent.change(screen.getByLabelText("Erstveröffentlichung von"), {
      target: { value: "2000" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?jahrVon=2000");
  });

  it("commits a jahrBis change to the router immediately", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    fireEvent.change(screen.getByLabelText("Erstveröffentlichung bis"), {
      target: { value: "2020" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?jahrBis=2020");
  });

  it("seeds both thumbs from the current filters", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        filters={{ yearFrom: 2000, yearTo: 2020 }}
      />,
    );

    expect(screen.getByLabelText("Erstveröffentlichung von")).toHaveValue(
      "2000",
    );
    expect(screen.getByLabelText("Erstveröffentlichung bis")).toHaveValue(
      "2020",
    );
  });
});

describe("LudothekBrowser — Bewertung von/bis (#214-Folge)", () => {
  it("commits a bewertungVon change to the router immediately", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    fireEvent.change(screen.getByLabelText("Bewertung von"), {
      target: { value: "6" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?bewertungVon=6");
  });

  it("commits a bewertungBis change to the router immediately", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    fireEvent.change(screen.getByLabelText("Bewertung bis"), {
      target: { value: "9" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?bewertungBis=9");
  });

  it("seeds both thumbs from the current filters", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        filters={{ ratingFrom: 6, ratingTo: 9 }}
      />,
    );

    expect(screen.getByLabelText("Bewertung von")).toHaveValue("6");
    expect(screen.getByLabelText("Bewertung bis")).toHaveValue("9");
  });
});

describe("LudothekBrowser — Dauer von/bis (#214-Folge)", () => {
  it("commits a dauerVon change to the router immediately", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        maxDurationBound={180}
      />,
    );

    fireEvent.change(screen.getByLabelText("Dauer von"), {
      target: { value: "30" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?dauerVon=30");
  });

  it("seeds both thumbs from the current filters", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        maxDurationBound={180}
        filters={{ durationFrom: 30, durationTo: 90 }}
      />,
    );

    expect(screen.getByLabelText("Dauer von")).toHaveValue("30");
    expect(screen.getByLabelText("Dauer bis")).toHaveValue("90");
  });
});

describe("LudothekBrowser — Spieler (#214-Folge-Korrektur: Ein-Knoten-Slider, 1–8 dann '9+')", () => {
  it("commits a players change to the router immediately", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    fireEvent.change(screen.getByLabelText("Spieler"), {
      target: { value: "4" },
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?spieler=4");
  });

  it("seeds the thumb from the current filter", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        filters={{ players: 4 }}
      />,
    );

    expect(screen.getByLabelText("Spieler")).toHaveValue("4");
  });

  it("shows '9+' at the slider's fixed upper bound", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal={false}
        filters={{ players: 9 }}
      />,
    );

    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});

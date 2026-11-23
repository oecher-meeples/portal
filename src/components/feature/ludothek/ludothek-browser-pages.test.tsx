import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";

// Seiten-State des Browsers (#461): Nachladen hängt an, ein Filterwechsel
// setzt auf Seite 1 zurück. Mocks wie in ludothek-browser.test.tsx.
let fireSentinel: () => void = () => {};
vi.stubGlobal(
  "IntersectionObserver",
  class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(element: Element) {
      // `next/link` beobachtet seine <a> fürs Prefetching — nur das
      // Sentinel-<div> der Ergebnisliste ist hier gemeint.
      if (element.tagName !== "DIV") return;
      fireSentinel = () =>
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
    }
    unobserve() {}
    disconnect() {}
  },
);
const loadMoreMock = vi.fn();
vi.mock("@/components/feature/ludothek/actions", () => ({
  loadMoreLudothekGames: (...args: unknown[]) => loadMoreMock(...args),
}));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
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

function title(n: number): PublicLudothekGame {
  return {
    id: `copy-${n}`,
    boardGameId: `title-${n}`,
    slug: `spiel-${n}`,
    boardGameSlug: `spiel-${n}`,
    title: `Spiel ${n}`,
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: null,
    averageRating: null,
    mechanics: [],
    categories: [],
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    illustrator: [],
    yearPublished: null,
    editionLanguages: [],
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    explainerCount: 0,
    hasOpenLfg: false,
    traits: [],
    notes: null,
    isPrivate: false,
  };
}

function props(games: PublicLudothekGame[], q?: string) {
  return {
    games,
    nextOffset: 1,
    internal: false,
    basePath: "/ludothek",
    rawSearchParams: q ? { q } : {},
    filters: q ? { search: q } : {},
    mechanicsOptions: [],
    categoriesOptions: [],
  };
}

describe("LudothekBrowser — Seiten nachladen (#461)", () => {
  it("appends the next page from the server action at the list end", async () => {
    loadMoreMock.mockResolvedValue({ games: [title(2)], nextOffset: null });
    render(<LudothekBrowser {...props([title(1)])} />);

    await act(async () => fireSentinel());

    expect(loadMoreMock).toHaveBeenCalledWith({}, 1);
    expect(screen.getByText("Spiel 1")).toBeInTheDocument();
    expect(screen.getByText("Spiel 2")).toBeInTheDocument();
    expect(screen.getByText("Alle Spiele geladen.")).toBeInTheDocument();
  });

  it("drops loaded pages when a filter change brings a new first page", async () => {
    loadMoreMock.mockResolvedValue({ games: [title(2)], nextOffset: 2 });
    const { rerender } = render(<LudothekBrowser {...props([title(1)])} />);
    await act(async () => fireSentinel());
    expect(screen.getByText("Spiel 2")).toBeInTheDocument();

    rerender(<LudothekBrowser {...props([title(3)], "drei")} />);

    expect(screen.getByText("Spiel 3")).toBeInTheDocument();
    expect(screen.queryByText("Spiel 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Spiel 2")).not.toBeInTheDocument();
  });

  it("keeps loaded pages on a refresh with the same filters", async () => {
    loadMoreMock.mockResolvedValue({ games: [title(2)], nextOffset: 2 });
    const { rerender } = render(<LudothekBrowser {...props([title(1)])} />);
    await act(async () => fireSentinel());

    rerender(<LudothekBrowser {...props([{ ...title(1) }])} />);

    expect(screen.getByText("Spiel 1")).toBeInTheDocument();
    expect(screen.getByText("Spiel 2")).toBeInTheDocument();
  });
});

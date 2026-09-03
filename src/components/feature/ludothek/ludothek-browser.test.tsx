import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import type { LudothekGame } from "@/lib/ludothek/browser";

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
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned("4001504311892")}>
      simulate-scan
    </button>
  ),
}));
vi.mock("@/components/widgets/board-game/create-board-game-dialog", () => ({
  CreateBoardGameDialog: ({
    defaultBggQuery,
  }: {
    defaultBggQuery?: string;
  }) => (
    <button type="button" data-default-bgg-query={defaultBggQuery ?? ""}>
      Spiel anlegen
    </button>
  ),
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
    categoriesOptions: [],
  };
}

function game(overrides: Partial<LudothekGame> = {}): LudothekGame {
  return {
    id: "game-1",
    boardGameId: "title-1",
    slug: "arche-nova",
    boardGameSlug: "arche-nova",
    title: "Arche Nova",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.7,
    averageRating: 8.5,
    mechanics: [],
    categories: [],
    ean: null,
    condition: null,
    inventoryNumber: null,
    bggId: null,
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: null,
    responsibleName: null,
    responsibleProfilePictureUrl: null,
    responsibleProfilePictureVisibility: "INTERN",
    isUnconfirmed: false,
    unitChain: "Regal A",
    locationChain: "Regal A",
    explainerCount: 0,
    hasOpenLfg: false,
    isPrivate: false,
    ...overrides,
  };
}

describe("LudothekBrowser — live search", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the q search param after the debounce delay while typing", () => {
    vi.useFakeTimers();
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    const input = screen.getByPlaceholderText(
      "Spiel, EAN oder BGG-ID suchen …",
    );
    fireEvent.change(input, { target: { value: "arche" } });
    expect(routerReplaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?q=arche");
  });

  it.each([false, true])(
    "has no link to /scan and a scan sets q instead (internal=%s)",
    (internal) => {
      vi.useFakeTimers();
      render(<LudothekBrowser {...baseProps()} internal={internal} />);

      expect(
        screen.queryByRole("link", { name: /Scannen/ }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("simulate-scan"));
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(routerReplaceMock).toHaveBeenCalledWith(
        "/ludothek?q=4001504311892",
      );
    },
  );
});

describe("LudothekBrowser — Enter im Suchfeld (#286)", () => {
  it("submits via router.replace instead of native form navigation, even with an empty field", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(form!, submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek");
  });

  it("submits the current (not-yet-debounced) search value immediately", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    const input = screen.getByPlaceholderText(
      "Spiel, EAN oder BGG-ID suchen …",
    );
    fireEvent.change(input, { target: { value: "arche" } });

    const form = document.querySelector("form");
    fireEvent.submit(form!);

    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    expect(routerReplaceMock).toHaveBeenCalledWith("/ludothek?q=arche");
  });
});

// Erstveröffentlichung-, Bewertung-, Dauer- und Spieler-Slider-Tests siehe
// ludothek-browser-ranges.test.tsx (#214-Folge, ausgelagert wegen Dateigröße).

describe("LudothekBrowser — view mode switch", () => {
  it("hides the compact icon for guests and internal users without games:manage", () => {
    render(
      <LudothekBrowser {...baseProps()} internal canManageGames={false} />,
    );

    expect(screen.getByRole("link", { name: "Raster" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Liste" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Kompakt" }),
    ).not.toBeInTheDocument();
  });

  it("shows the compact icon for users with games:manage", () => {
    render(<LudothekBrowser {...baseProps()} internal canManageGames />);

    expect(screen.getByRole("link", { name: "Kompakt" })).toBeInTheDocument();
  });

  it("renders the view mode switch outside the collapsible filter <details>", () => {
    render(<LudothekBrowser {...baseProps()} internal canManageGames />);

    const details = document.querySelector("details");
    const switchLink = screen.getByRole("link", { name: "Raster" });
    expect(details?.contains(switchLink)).toBe(false);
  });
});

describe("LudothekBrowser — create-board-game button (#121)", () => {
  it("hides the create button without games:manage", () => {
    render(
      <LudothekBrowser {...baseProps()} internal canManageGames={false} />,
    );

    expect(screen.queryByText("Spiel anlegen")).not.toBeInTheDocument();
  });

  it("shows the create button for users with games:manage", () => {
    render(<LudothekBrowser {...baseProps()} internal canManageGames />);

    expect(screen.getByText("Spiel anlegen")).toBeInTheDocument();
  });

  it("passes the current search query through as the BGG-import default (#183)", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        internal
        canManageGames
        filters={{ search: "Ark Nova" }}
      />,
    );

    expect(screen.getByText("Spiel anlegen")).toHaveAttribute(
      "data-default-bgg-query",
      "Ark Nova",
    );
  });
});

describe("LudothekBrowser — Zeige nur Spielergesuche filter (#144)", () => {
  it("hides the toggle for guests", () => {
    render(<LudothekBrowser {...baseProps()} internal={false} />);

    expect(
      screen.queryByText("Zeige nur Spielergesuche"),
    ).not.toBeInTheDocument();
  });

  it("shows the toggle for logged-in Meeples", () => {
    render(<LudothekBrowser {...baseProps()} internal />);

    expect(screen.getByText("Zeige nur Spielergesuche")).toBeInTheDocument();
  });
});

describe("LudothekBrowser — three render modes", () => {
  it("renders a grid by default", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        internal
        canManageGames
      />,
    );

    expect(document.querySelector(".grid")).toBeInTheDocument();
    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
  });

  it("renders GameListRow-style rows for ?ansicht=liste", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        filters={{ view: "liste" }}
        internal
        canManageGames
      />,
    );

    expect(document.querySelector(".grid")).not.toBeInTheDocument();
    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
  });

  it("renders GameCompactRow-style rows for ?ansicht=compact when canManageGames", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        filters={{ view: "compact" }}
        internal
        canManageGames
      />,
    );

    expect(screen.getByText("Regal A")).toBeInTheDocument();
  });

  it("renders private-collection rows in the same view mode as club games, linked like any other title (#255-Folge)", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[
          game({
            id: "entry-1",
            boardGameId: "title-private",
            boardGameSlug: "dune-imperium",
            title: "Dune: Imperium",
            zustand: "privat",
            isPrivate: true,
          }),
        ]}
        filters={{ view: "liste", showPrivateCollection: true }}
        internal
        canManageGames
      />,
    );

    expect(
      screen.getByRole("link", { name: /Dune: Imperium/ }),
    ).toHaveAttribute("href", "/ludothek/dune-imperium");
  });
});

describe("LudothekBrowser — Bearbeiten opens the title dialog (Plan-Schritt 10)", () => {
  it.each(["liste", "compact"] as const)(
    "opens the title dialog, not an exemplar dialog, from the %s row",
    async (view) => {
      render(
        <LudothekBrowser
          {...baseProps()}
          games={[game()]}
          filters={{ view }}
          internal
          canManageGames
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Titel bearbeiten/ }));

      expect(await screen.findByLabelText("Titel")).toBeInTheDocument();
      expect(screen.queryByLabelText("Mängelvermerk")).not.toBeInTheDocument();
    },
  );

  it("opens the title dialog from the grid card's edit overlay", async () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        internal
        canManageGames
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Titel bearbeiten/ }));

    expect(await screen.findByLabelText("Titel")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mängelvermerk")).not.toBeInTheDocument();
  });

  it("offers Exemplar bearbeiten in the actions menu instead", async () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        filters={{ view: "liste" }}
        internal
        canManageGames
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(await screen.findByText("Exemplar bearbeiten")).toBeInTheDocument();
  });
});

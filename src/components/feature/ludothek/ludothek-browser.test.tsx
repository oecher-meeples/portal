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
    mechanics: [],
    ean: null,
    condition: null,
    bggId: null,
    alternateNames: [],
    secondaryAlternateName: null,
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: null,
    responsibleName: null,
    unitChain: "Regal A",
    locationChain: "Regal A",
    explainerCount: 0,
    hasOpenLfg: false,
    ...overrides,
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
    expect(
      screen.getByText(/im Privatbesitz von Lea Demo/),
    ).toBeInTheDocument();
  });
});

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
      vi.advanceTimersByTime(300);
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
        vi.advanceTimersByTime(300);
      });

      expect(routerReplaceMock).toHaveBeenCalledWith(
        "/ludothek?q=4001504311892",
      );
    },
  );
});

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

  it("keeps the 'Privatbesitz'-section a grid regardless of the chosen mode", () => {
    render(
      <LudothekBrowser
        {...baseProps()}
        games={[game()]}
        filters={{ view: "liste", showPrivateCollection: true }}
        internal
        canManageGames
        privateCollectionResults={[
          {
            id: "entry-1",
            title: "Dune: Imperium",
            imageUrl: null,
            minPlayers: 1,
            maxPlayers: 4,
            playTimeMinutes: 60,
            ownerMeepleId: "meeple-1",
            ownerDisplayName: "Lea Demo",
          },
        ]}
      />,
    );

    expect(screen.getByText("Dune: Imperium")).toBeInTheDocument();
    const grids = document.querySelectorAll(".grid");
    expect(grids.length).toBeGreaterThan(0);
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

  it("offers Mängelvermerk bearbeiten in the actions menu instead", async () => {
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

    expect(
      await screen.findByText("Mängelvermerk bearbeiten"),
    ).toBeInTheDocument();
  });
});

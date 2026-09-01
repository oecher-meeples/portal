import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/ludothek/game-copies", () => ({
  requestCompletenessCheck: vi.fn(),
}));

vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned("4001504311892")}>
      simulate-scan
    </button>
  ),
}));

vi.mock("@/components/widgets/board-game/create-board-game-dialog", () => ({
  CreateBoardGameDialog: () => null,
}));
vi.mock(
  "@/components/widgets/board-game/bulk-import-board-games-dialog",
  () => ({
    BulkImportBoardGamesDialog: () => null,
  }),
);
vi.mock("@/components/widgets/board-game/edit-board-game-dialog", () => ({
  EditBoardGameDialog: () => null,
}));
vi.mock("@/components/widgets/game-holding/game-actions-menu", () => ({
  GameActionsMenu: () => null,
}));
vi.mock(
  "@/components/feature/admin-bestand/admin-bestand-csv-export-dialog",
  () => ({
    AdminBestandCsvExportDialog: () => <div>csv-export-dialog</div>,
  }),
);

const { AdminBestandView } = await import("./admin-bestand-view");

const games = [
  {
    id: "1",
    boardGameId: "bg-1",
    title: "Catan",
    secondaryTitle: null,
    ean: "4001504311892",
    status: "ACTIVE" as const,
    needsCompletenessCheck: false,
    lastCheckedAt: null,
    archivedReason: null,
    zustand: "frei" as const,
    locationChain: "Regal A",
    bggId: 13,
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.3,
    averageRating: 8.1,
    imageUrl: null,
    description: null,
    mechanics: [],
    categories: [],
    condition: null,
    inventoryNumber: null,
    explainerVideoUrl: null,
    alternateNames: [],
    kind: "BOARDGAME" as const,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
  },
  {
    id: "2",
    boardGameId: "bg-2",
    title: "Carcassonne",
    secondaryTitle: null,
    ean: null,
    status: "ACTIVE" as const,
    needsCompletenessCheck: false,
    lastCheckedAt: null,
    archivedReason: null,
    zustand: "frei" as const,
    locationChain: "Regal B",
    bggId: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 1.8,
    averageRating: null,
    imageUrl: null,
    description: null,
    mechanics: [],
    categories: [],
    condition: null,
    inventoryNumber: null,
    explainerVideoUrl: null,
    alternateNames: [],
    kind: "BOARDGAME" as const,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
  },
];

describe("AdminBestandView search", () => {
  it("filters the table when a scan resolves to an EAN", () => {
    render(
      <AdminBestandView
        games={games}
        showDeinventarised={false}
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Carcassonne")).toBeInTheDocument();

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.queryByText("Carcassonne")).not.toBeInTheDocument();
  });
});

describe("AdminBestandView defaultQuickFilter (#224-Folge)", () => {
  it("pre-selects the quick filter from the Admin-Dashboard deep link", () => {
    render(
      <AdminBestandView
        games={[
          ...games,
          {
            ...games[0],
            id: "3",
            title: "Nicht erfasst",
            zustand: "nicht-erfasst" as const,
          },
        ]}
        showDeinventarised={false}
        canManageGames={false}
        defaultQuickFilter="nicht-erfasst"
      />,
    );

    expect(
      screen.getByRole("cell", { name: "Nicht erfasst" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    expect(screen.queryByText("Carcassonne")).not.toBeInTheDocument();
  });
});

describe("AdminBestandView CSV export gating", () => {
  it("hides the export without games:manage", () => {
    render(
      <AdminBestandView
        games={games}
        showDeinventarised={false}
        canManageGames={false}
      />,
    );

    expect(screen.queryByText("csv-export-dialog")).not.toBeInTheDocument();
  });

  it("shows the export with games:manage", () => {
    render(
      <AdminBestandView
        games={games}
        showDeinventarised={false}
        canManageGames={true}
      />,
    );

    expect(screen.getByText("csv-export-dialog")).toBeInTheDocument();
  });
});

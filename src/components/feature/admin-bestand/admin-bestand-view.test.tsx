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

vi.mock("@/components/feature/admin-bestand/create-board-game-dialog", () => ({
  CreateBoardGameDialog: () => null,
}));
vi.mock("@/components/feature/admin-bestand/deinventorise-board-game-dialog", () => ({
  DeinventoriseBoardGameDialog: () => null,
}));
vi.mock("@/components/widgets/board-game/edit-board-game-dialog", () => ({
  EditBoardGameDialog: () => null,
}));
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => null,
}));

const { AdminBestandView } = await import("./admin-bestand-view");

const games = [
  {
    id: "1",
    boardGameId: "bg-1",
    title: "Catan",
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
    imageUrl: null,
    description: null,
    mechanics: [],
    condition: null,
    explainerVideoUrl: null,
  },
  {
    id: "2",
    boardGameId: "bg-2",
    title: "Carcassonne",
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
    imageUrl: null,
    description: null,
    mechanics: [],
    condition: null,
    explainerVideoUrl: null,
  },
];

describe("AdminBestandView search", () => {
  it("filters the table when a scan resolves to an EAN", () => {
    render(
      <AdminBestandView games={games} showDeinventarised={false} />,
    );

    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Carcassonne")).toBeInTheDocument();

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.queryByText("Carcassonne")).not.toBeInTheDocument();
  });
});

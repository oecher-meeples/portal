import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import type { LudothekGame } from "@/lib/ludothek/browser";
import { LudothekResults } from "@/components/feature/ludothek/ludothek-results";

vi.mock("@/components/widgets/board-game/game-card-edit-overlay", () => ({
  GameCardEditOverlay: () => null,
}));
vi.mock(
  "@/components/widgets/board-game/edit-board-game-exemplar-dialog",
  () => ({
    EditBoardGameExemplarDialog: () => null,
  }),
);
vi.mock("@/components/widgets/game-holding/game-actions-menu", () => ({
  GameActionsMenu: () => null,
}));

afterEach(() => {
  cleanup();
});

function game(overrides: Partial<LudothekGame> = {}): LudothekGame {
  return {
    id: "copy-1",
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
    ...overrides,
  };
}

const TWO_COPIES = [
  game({ id: "copy-1" }),
  game({ id: "copy-2", zustand: "ausgeliehen" }),
];

describe("LudothekResults — one entry per title (#121/#122)", () => {
  it("shows exactly one grid card for two copies of the same title", () => {
    render(
      <LudothekResults games={TWO_COPIES} view="grid" canManageGames={false} />,
    );

    expect(screen.getAllByText("Arche Nova")).toHaveLength(1);
  });

  it("shows exactly one list row for two copies of the same title", () => {
    render(
      <LudothekResults
        games={TWO_COPIES}
        view="liste"
        canManageGames={false}
      />,
    );

    expect(screen.getAllByText("Arche Nova")).toHaveLength(1);
  });

  it("shows exactly one compact row for two copies of the same title", () => {
    render(
      <LudothekResults
        games={TWO_COPIES}
        view="compact"
        canManageGames={true}
      />,
    );

    expect(screen.getAllByText("Arche Nova")).toHaveLength(1);
  });

  it("shows the aggregated best zustand (frei beats ausgeliehen)", () => {
    render(
      <LudothekResults
        games={TWO_COPIES}
        view="compact"
        canManageGames={true}
      />,
    );

    expect(screen.getByText("Frei")).toBeInTheDocument();
  });

  it("still shows one card per distinct title", () => {
    render(
      <LudothekResults
        games={[
          ...TWO_COPIES,
          game({ id: "copy-3", boardGameId: "title-2", title: "Wingspan" }),
        ]}
        view="grid"
        canManageGames={false}
      />,
    );

    expect(screen.getAllByText("Arche Nova")).toHaveLength(1);
    expect(screen.getAllByText("Wingspan")).toHaveLength(1);
  });
});

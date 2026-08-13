import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";

vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: () => null,
}));
vi.mock("@/components/feature/ludothek/explainer-game-panel", () => ({
  ExplainerGamePanel: () => null,
}));
vi.mock("@/components/widgets/board-game/assign-expansion-dialog", () => ({
  AssignExpansionDialog: () => null,
}));

const { GameDetailView } =
  await import("@/components/feature/ludothek/game-detail-view");

afterEach(() => {
  cleanup();
});

function game(overrides: Partial<PublicLudothekGame> = {}): PublicLudothekGame {
  return {
    id: "game-1",
    boardGameId: "title-1",
    slug: "arche-nova",
    title: "Arche Nova",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.7,
    mechanics: [],
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    ...overrides,
  };
}

describe("GameDetailView — offene Gesuche (#34)", () => {
  it("shows the section with the correct fields when open posts exist", () => {
    render(
      <GameDetailView
        game={game()}
        openLfgPosts={[
          {
            id: "post-1",
            title: "Wer hat Lust auf Arche Nova?",
            dateNote: "Nächsten Dienstag",
            plannedAt: null,
            location: "Vereinsraum",
            maxParticipants: 4,
            participantCount: 2,
          },
        ]}
      />,
    );

    expect(screen.getByText("Offene Gesuche")).toBeInTheDocument();
    expect(
      screen.getByText("Wer hat Lust auf Arche Nova?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nächsten Dienstag/)).toBeInTheDocument();
    expect(screen.getByText(/Vereinsraum/)).toBeInTheDocument();
    expect(screen.getByText(/2\/4/)).toBeInTheDocument();
  });

  it("omits the section entirely when there are no open posts", () => {
    render(<GameDetailView game={game()} openLfgPosts={[]} />);

    expect(screen.queryByText("Offene Gesuche")).not.toBeInTheDocument();
  });

  it("omits the section when openLfgPosts is not passed (guests)", () => {
    render(<GameDetailView game={game()} />);

    expect(screen.queryByText("Offene Gesuche")).not.toBeInTheDocument();
  });
});

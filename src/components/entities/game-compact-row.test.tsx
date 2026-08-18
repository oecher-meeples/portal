import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameCompactRow } from "@/components/entities/game-compact-row";
import type { LudothekGame } from "@/lib/ludothek/browser";

afterEach(() => {
  cleanup();
});

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
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
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

describe("GameCompactRow", () => {
  it("renders title, location chain and zustand pill", () => {
    render(<GameCompactRow game={game()} />);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("Regal A")).toBeInTheDocument();
    expect(screen.getByText("Frei")).toBeInTheDocument();
  });

  it("places caller-supplied actions in a navigation-stopping overlay (#121/#122)", () => {
    render(
      <GameCompactRow
        game={game()}
        actions={<button type="button">Bearbeiten</button>}
      />,
    );

    expect(screen.getByText("Bearbeiten")).toBeInTheDocument();
  });

  it("omits the actions overlay without a caller-supplied actions node", () => {
    render(<GameCompactRow game={game()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows no copy-count suffix for exactly one copy", () => {
    render(<GameCompactRow game={{ ...game(), copyCount: 1 }} />);

    expect(screen.queryByText(/\(x/)).not.toBeInTheDocument();
  });

  it("shows (x2) for two copies", () => {
    render(<GameCompactRow game={{ ...game(), copyCount: 2 }} />);

    expect(screen.getByText("(x2)")).toBeInTheDocument();
  });

  it("shows (x3) for three copies", () => {
    render(<GameCompactRow game={{ ...game(), copyCount: 3 }} />);

    expect(screen.getByText("(x3)")).toBeInTheDocument();
  });
});

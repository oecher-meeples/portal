import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameCompactRow } from "@/components/entities/game-compact-row";
import type { LudothekGame } from "@/lib/ludothek/browser";

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
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: null,
    locationChain: "Regal A",
    ...overrides,
  };
}

describe("GameCompactRow", () => {
  it("renders title, location chain and zustand pill, without action buttons", () => {
    render(<GameCompactRow game={game()} />);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("Regal A")).toBeInTheDocument();
    expect(screen.getByText("Frei")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

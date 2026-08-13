import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameCard } from "@/components/entities/game-card";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";

afterEach(() => {
  cleanup();
});

function game(
  overrides: Partial<PublicLudothekGame> = {},
): PublicLudothekGame {
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

describe("GameCard — expansion ribbon (#103)", () => {
  it("shows the ribbon corner for an expansion", () => {
    render(<GameCard game={game({ kind: BoardGameKind.BOARDGAME_EXPANSION })} />);

    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
  });

  it("does not show the ribbon corner for a base game", () => {
    render(<GameCard game={game({ kind: BoardGameKind.BOARDGAME })} />);

    expect(screen.queryByText("Erweiterung")).not.toBeInTheDocument();
  });
});

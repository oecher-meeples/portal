import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameListRow } from "@/components/entities/game-list-row";
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
    mechanics: ["Engine-Building"],
    description: "Baue den modernsten Zoo der Welt.",
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    ...overrides,
  };
}

describe("GameListRow", () => {
  it("renders the core fields, description clamped by default", () => {
    render(<GameListRow game={game()} />);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("1–4 Spieler · 90’")).toBeInTheDocument();
    const [description] = screen.getAllByText(
      "Baue den modernsten Zoo der Welt.",
    );
    expect(description).toHaveClass("line-clamp-2");
  });

  it("shows the expanded overlay only after mouseEnter, hides it after mouseLeave", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link");

    expect(screen.getAllByText("Baue den modernsten Zoo der Welt.")).toHaveLength(1);

    fireEvent.mouseEnter(row);
    expect(screen.getAllByText("Baue den modernsten Zoo der Welt.")).toHaveLength(2);

    fireEvent.mouseLeave(row);
    expect(screen.getAllByText("Baue den modernsten Zoo der Welt.")).toHaveLength(1);
  });
});

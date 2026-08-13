import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameListRow } from "@/components/entities/game-list-row";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";

afterEach(() => {
  cleanup();
});

function game(overrides: Partial<PublicLudothekGame> = {}): PublicLudothekGame {
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

  it("sizes the cover to match the grid card format (#121)", () => {
    render(<GameListRow game={game()} />);

    expect(document.querySelector(".size-24")).toBeInTheDocument();
  });

  it("merges the hover overlay into the row — no gap, shared bottom radius", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link");

    fireEvent.mouseEnter(row);

    expect(row).toHaveClass("rounded-t-lg");
    const overlay = screen
      .getAllByText("Baue den modernsten Zoo der Welt.")[1]
      .closest("div");
    expect(overlay).toHaveClass("rounded-b-lg", "border-t-0", "-mt-px");
  });

  it("shows the expanded overlay only after mouseEnter, hides it after mouseLeave", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link");

    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(1);

    fireEvent.mouseEnter(row);
    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(2);

    fireEvent.mouseLeave(row);
    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(1);
  });

  it("first touch tap expands without navigating, second tap navigates", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link") as HTMLAnchorElement;

    fireEvent.pointerDown(row, { pointerType: "touch" });
    const firstClick = fireEvent.click(row);
    expect(firstClick).toBe(false); // preventDefault() was called
    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(2);

    fireEvent.pointerDown(row, { pointerType: "touch" });
    const secondClick = fireEvent.click(row);
    expect(secondClick).toBe(true); // navigation not prevented
  });

  it("does not intercept mouse clicks", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link") as HTMLAnchorElement;

    fireEvent.pointerDown(row, { pointerType: "mouse" });
    const result = fireEvent.click(row);
    expect(result).toBe(true);
  });

  it("shows a ribbon corner for an expansion (#103)", () => {
    render(
      <GameListRow game={game({ kind: BoardGameKind.BOARDGAME_EXPANSION })} />,
    );
    expect(
      document.querySelector("svg.lucide-package-plus"),
    ).toBeInTheDocument();
  });

  it("does not show a ribbon corner for a base game", () => {
    render(<GameListRow game={game({ kind: BoardGameKind.BOARDGAME })} />);
    expect(
      document.querySelector("svg.lucide-package-plus"),
    ).not.toBeInTheDocument();
  });
});

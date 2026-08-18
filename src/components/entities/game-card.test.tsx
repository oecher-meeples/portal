import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import { GameCard } from "@/components/entities/game-card";
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
    mechanics: [],
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    explainerCount: 0,
    hasOpenLfg: false,
    ...overrides,
  };
}

describe("GameCard — Verlag (#205)", () => {
  it("shows the publisher(s) when set", () => {
    render(<GameCard game={game({ publisher: ["Feuerland Spiele"] })} />);

    expect(screen.getByText("Feuerland Spiele")).toBeInTheDocument();
  });

  it("joins several publishers with a comma", () => {
    render(
      <GameCard
        game={game({ publisher: ["Feuerland Spiele", "Frosted Games"] })}
      />,
    );

    expect(
      screen.getByText("Feuerland Spiele, Frosted Games"),
    ).toBeInTheDocument();
  });

  it("omits the line when no publisher is set", () => {
    render(<GameCard game={game({ publisher: [] })} />);

    expect(screen.queryByText("Feuerland Spiele")).not.toBeInTheDocument();
  });
});

describe("GameCard — expansion ribbon (#103)", () => {
  it("shows the ribbon corner for an expansion", () => {
    render(
      <GameCard game={game({ kind: BoardGameKind.BOARDGAME_EXPANSION })} />,
    );

    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
  });

  it("does not show the ribbon corner for a base game", () => {
    render(<GameCard game={game({ kind: BoardGameKind.BOARDGAME })} />);

    expect(screen.queryByText("Erweiterung")).not.toBeInTheDocument();
  });
});

describe("GameCard — copy count suffix (#121/#122)", () => {
  it("shows no suffix for exactly one copy", () => {
    render(<GameCard game={{ ...game(), copyCount: 1 }} />);

    expect(screen.queryByText(/\(x/)).not.toBeInTheDocument();
  });

  it("shows (x2) for two copies", () => {
    render(<GameCard game={{ ...game(), copyCount: 2 }} />);

    expect(screen.getByText("(x2)")).toBeInTheDocument();
  });

  it("shows (x3) for three copies", () => {
    render(<GameCard game={{ ...game(), copyCount: 3 }} />);

    expect(screen.getByText("(x3)")).toBeInTheDocument();
  });
});

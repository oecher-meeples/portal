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
    averageRating: 8.5,
    mechanics: ["Engine-Building"],
    categories: [],
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    yearPublished: null,
    description: "Baue den modernsten Zoo der Welt.",
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    explainerCount: 0,
    hasOpenLfg: false,
    isPrivate: false,
    ...overrides,
  };
}

describe("GameListRow — Verlag (#205)", () => {
  it("shows the publisher(s) when set", () => {
    render(<GameListRow game={game({ publisher: ["Feuerland Spiele"] })} />);

    expect(screen.getByText("Feuerland Spiele")).toBeInTheDocument();
  });

  it("omits the line when no publisher is set", () => {
    render(<GameListRow game={game({ publisher: [] })} />);

    expect(screen.queryByText("Feuerland Spiele")).not.toBeInTheDocument();
  });
});

describe("GameListRow", () => {
  it("renders the core fields, description shown in full at its original spot", () => {
    render(<GameListRow game={game()} />);

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("1–4 Spieler · 90’")).toBeInTheDocument();
    const description = screen.getByText("Baue den modernsten Zoo der Welt.");
    expect(description).not.toHaveClass("line-clamp-3");
  });

  it("caps the description to 200 chars until hovered, shows it in full on hover", () => {
    const longDescription = Array(10)
      .fill("Ein sehr langer Beschreibungstext.")
      .join(" ");
    render(<GameListRow game={game({ description: longDescription })} />);
    const row = screen.getByRole("link");

    expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
    const collapsed = screen.getByText(/…$/);
    expect(collapsed.textContent!.length).toBeLessThanOrEqual(201);

    fireEvent.mouseEnter(row);
    expect(screen.getByText(longDescription)).toBeInTheDocument();

    fireEvent.mouseLeave(row);
    expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
  });

  it("sizes the cover to match the grid card format (#121)", () => {
    render(<GameListRow game={game()} />);

    expect(
      document.querySelector(".aspect-\\[3\\/4\\].w-32"),
    ).toBeInTheDocument();
  });

  it("merges the hover overlay into the row — no gap, shared bottom radius", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link");

    fireEvent.mouseEnter(row);

    expect(row).toHaveClass("rounded-t-lg");
    // "Engine-Building" sits in the mechanics-tag wrapper, one level below
    // the overlay itself.
    const overlay = screen
      .getByText("Engine-Building")
      .closest("div")?.parentElement;
    expect(overlay).toHaveClass("rounded-b-lg", "border-t-0", "-mt-px");
  });

  it("shows the full description exactly once, never doubled (Plan-Schritt 11)", () => {
    render(<GameListRow game={game()} />);
    const row = screen.getByRole("link");

    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(1);

    fireEvent.mouseEnter(row);
    expect(
      screen.getAllByText("Baue den modernsten Zoo der Welt."),
    ).toHaveLength(1);

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
    ).toHaveLength(1);

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
    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
  });

  it("does not show a ribbon corner for a base game", () => {
    render(<GameListRow game={game({ kind: BoardGameKind.BOARDGAME })} />);
    expect(screen.queryByText("Erweiterung")).not.toBeInTheDocument();
  });

  it("shows no copy-count suffix for exactly one copy", () => {
    render(<GameListRow game={{ ...game(), copyCount: 1 }} />);

    expect(screen.queryByText(/\(x/)).not.toBeInTheDocument();
  });

  it("shows (x2) for two copies", () => {
    render(<GameListRow game={{ ...game(), copyCount: 2 }} />);

    expect(screen.getByText("(x2)")).toBeInTheDocument();
  });

  it("shows (x3) for three copies", () => {
    render(<GameListRow game={{ ...game(), copyCount: 3 }} />);

    expect(screen.getByText("(x3)")).toBeInTheDocument();
  });

  it("omits the actions overlay without a caller-supplied actions node", () => {
    render(<GameListRow game={game()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("places caller-supplied actions in a navigation-stopping overlay (#121/#122)", () => {
    render(
      <GameListRow
        game={game()}
        actions={<button type="button">Bearbeiten</button>}
      />,
    );

    expect(screen.getByText("Bearbeiten")).toBeInTheDocument();
  });

  it("shows mechanics, categories, weight and Erklärbären count in the hover overlay (#143, #404)", () => {
    render(
      <GameListRow
        game={game({
          mechanics: ["Engine-Building", "Tableau-Building"],
          categories: ["Strategiespiel"],
          weight: 3.7,
          explainerCount: 2,
        })}
      />,
    );
    const row = screen.getByRole("link");

    fireEvent.mouseEnter(row);

    expect(screen.getByText("Engine-Building")).toBeInTheDocument();
    expect(screen.getByText("Tableau-Building")).toBeInTheDocument();
    expect(screen.getByText("Strategiespiel")).toBeInTheDocument();
    expect(screen.getByText("Gewichtung 3.7/5")).toBeInTheDocument();
    expect(screen.getByText("2 Erklärbären")).toBeInTheDocument();
  });

  it("uses the singular for exactly one Erklärbär", () => {
    render(<GameListRow game={game({ explainerCount: 1 })} />);
    fireEvent.mouseEnter(screen.getByRole("link"));

    expect(screen.getByText("1 Erklärbär")).toBeInTheDocument();
  });

  it("keeps playersAndDuration visible outside the overlay and never duplicated (#143)", () => {
    render(<GameListRow game={game({ explainerCount: 2 })} />);
    const row = screen.getByRole("link");

    expect(screen.getAllByText("1–4 Spieler · 90’")).toHaveLength(1);
    fireEvent.mouseEnter(row);
    expect(screen.getAllByText("1–4 Spieler · 90’")).toHaveLength(1);
  });
});

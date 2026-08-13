import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoardGameKind } from "@prisma/client";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: () => null,
}));
vi.mock("@/components/feature/ludothek/explainer-game-panel", () => ({
  ExplainerGamePanel: () => null,
}));
vi.mock("@/components/widgets/board-game/assign-expansion-dialog", () => ({
  AssignExpansionDialog: ({ game }: { game: { kind: string } }) => (
    <button type="button">
      {game.kind === "BOARDGAME_EXPANSION"
        ? "Basisspiel zuordnen"
        : "Erweiterung hinzufügen"}
    </button>
  ),
}));
const { removeExpansionAssignment } = vi.hoisted(() => ({
  removeExpansionAssignment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/ludothek/board-games", () => ({ removeExpansionAssignment }));
vi.mock("@/components/widgets/board-game/edit-board-game-title-dialog", () => ({
  EditBoardGameTitleDialog: () => (
    <button type="button">Titel bearbeiten</button>
  ),
}));
vi.mock("@/components/feature/ludothek/game-copies-section", () => ({
  GameCopiesSection: () => null,
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
    boardGameSlug: "arche-nova",
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
    explainerCount: 0,
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

const TITLE_EDIT_FIXTURE = {
  boardGameId: "title-1",
  title: "Arche Nova",
  ean: null,
  kind: BoardGameKind.BOARDGAME,
  bggId: null,
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 90,
  weight: 3.7,
  imageUrl: null,
  description: null,
  mechanics: [],
  explainerVideoUrl: null,
};

describe("GameDetailView — Titel bearbeiten (#121/#122)", () => {
  it("shows the edit button when titleEdit is set (games:manage)", () => {
    render(<GameDetailView game={game()} titleEdit={TITLE_EDIT_FIXTURE} />);

    expect(screen.getByText("Titel bearbeiten")).toBeInTheDocument();
  });

  it("hides the edit button when titleEdit is not set (no permission)", () => {
    render(<GameDetailView game={game()} />);

    expect(screen.queryByText("Titel bearbeiten")).not.toBeInTheDocument();
  });
});

describe("GameDetailView — related-game cards (#121/#122)", () => {
  const BASE_GAME_REF = {
    id: "base-1",
    title: "Arche Nova",
    slug: "arche-nova",
    imageUrl: null,
  };
  const EXPANSION_REF = {
    id: "expansion-1",
    title: "Arche Nova: Erweiterung",
    slug: "arche-nova-erweiterung",
    imageUrl: null,
  };

  it("renders a card (not a pill) for a linked base game", () => {
    render(<GameDetailView game={game({ baseGames: [BASE_GAME_REF] })} />);

    expect(screen.getByRole("link", { name: /Arche Nova/ })).toHaveAttribute(
      "href",
      "/ludothek/arche-nova",
    );
  });

  it("renders a card for each linked expansion, symmetrically", () => {
    render(<GameDetailView game={game({ expansions: [EXPANSION_REF] })} />);

    expect(
      screen.getByRole("link", { name: /Arche Nova: Erweiterung/ }),
    ).toHaveAttribute("href", "/ludothek/arche-nova-erweiterung");
  });

  it("shows the related title's standort only for internal viewers", () => {
    render(
      <GameDetailView
        game={game({ baseGames: [BASE_GAME_REF] })}
        relatedLocationChains={{ "base-1": "Regal B" }}
      />,
    );

    expect(screen.getByText("Regal B")).toBeInTheDocument();
  });

  it("shows the add-expansion trigger for a base game without base games of its own", () => {
    render(
      <GameDetailView game={game()} expansionAssignment={{ options: [] }} />,
    );

    expect(
      screen.getByRole("button", { name: "Erweiterung hinzufügen" }),
    ).toBeInTheDocument();
  });

  it("hides the add-expansion trigger once the title has base games (kind not yet corrected)", () => {
    render(
      <GameDetailView
        game={game({ baseGames: [BASE_GAME_REF] })}
        expansionAssignment={{ options: [] }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Erweiterung hinzufügen" }),
    ).not.toBeInTheDocument();
  });

  it("hides the add-expansion trigger on an expansion's own page", () => {
    render(
      <GameDetailView
        game={game({ kind: BoardGameKind.BOARDGAME_EXPANSION })}
        expansionAssignment={{ options: [] }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Erweiterung hinzufügen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Basisspiel zuordnen" }),
    ).toBeInTheDocument();
  });

  it("wires the base-game card's remove button to removeExpansionAssignment", () => {
    render(
      <GameDetailView
        game={game({ baseGames: [BASE_GAME_REF] })}
        expansionAssignment={{ options: [] }}
      />,
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    screen.getByRole("button", { name: /Entfernen/ }).click();

    expect(removeExpansionAssignment).toHaveBeenCalledWith("base-1", "title-1");
  });

  it("wires the expansion card's remove button to removeExpansionAssignment", () => {
    render(
      <GameDetailView
        game={game({ expansions: [EXPANSION_REF] })}
        expansionAssignment={{ options: [] }}
      />,
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    screen.getByRole("button", { name: /Entfernen/ }).click();

    expect(removeExpansionAssignment).toHaveBeenCalledWith(
      "title-1",
      "expansion-1",
    );
  });

  it("omits the remove button when the viewer cannot manage games", () => {
    render(<GameDetailView game={game({ baseGames: [BASE_GAME_REF] })} />);

    expect(
      screen.queryByRole("button", { name: /Entfernen/ }),
    ).not.toBeInTheDocument();
  });
});

describe("GameDetailView — expansion ribbon (#121/#122)", () => {
  it("shows the ribbon corner for an expansion", () => {
    render(
      <GameDetailView
        game={game({ kind: BoardGameKind.BOARDGAME_EXPANSION })}
      />,
    );

    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
  });

  it("hides the ribbon corner for a base game", () => {
    render(<GameDetailView game={game({ kind: BoardGameKind.BOARDGAME })} />);

    expect(screen.queryByText("Erweiterung")).not.toBeInTheDocument();
  });
});

describe("GameDetailView — guest availability (#121)", () => {
  it("shows a plain copy count", () => {
    render(
      <GameDetailView
        game={game()}
        availability={{ kind: "plain", total: 3 }}
      />,
    );

    expect(screen.getByText("3 Exemplare")).toBeInTheDocument();
  });

  it("shows the singular form for exactly one copy", () => {
    render(
      <GameDetailView
        game={game()}
        availability={{ kind: "plain", total: 1 }}
      />,
    );

    expect(screen.getByText("1 Exemplar")).toBeInTheDocument();
  });

  it("shows X von Y verfügbar with the shelf label during an event", () => {
    render(
      <GameDetailView
        game={game()}
        availability={{
          kind: "event",
          total: 2,
          inRoom: 2,
          available: 1,
          shelfLabels: ["Regal A"],
        }}
      />,
    );

    expect(screen.getByText("1 von 2 verfügbar (Regal A)")).toBeInTheDocument();
  });

  it("omits the line entirely when no availability is passed (internal viewers)", () => {
    render(<GameDetailView game={game()} />);

    expect(screen.queryByText(/Exemplar/)).not.toBeInTheDocument();
  });
});

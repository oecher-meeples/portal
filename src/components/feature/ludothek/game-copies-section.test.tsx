import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameCopiesSection } from "@/components/feature/ludothek/game-copies-section";
import type { GameCopyRow } from "@/components/feature/ludothek/game-copies-section";

vi.mock(
  "@/components/widgets/board-game/edit-board-game-exemplar-dialog",
  () => ({
    EditBoardGameExemplarDialog: () => <button type="button">Bearbeiten</button>,
  }),
);
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => (
    <button type="button">Weiteres Exemplar</button>
  ),
}));

afterEach(() => {
  cleanup();
});

function copy(overrides: Partial<GameCopyRow> = {}): GameCopyRow {
  return {
    id: "copy-1",
    zustand: "frei",
    locationChain: "Regal A",
    responsibleName: null,
    condition: null,
    ...overrides,
  };
}

describe("GameCopiesSection", () => {
  it("renders a card for exactly one copy", () => {
    render(
      <GameCopiesSection
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Exemplar")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Regal A")).toBeInTheDocument();
  });

  it("renders a table for more than one copy", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({ id: "copy-1", locationChain: "Regal A" }),
          copy({ id: "copy-2", locationChain: "Regal B" }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Exemplare")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Regal A")).toBeInTheDocument();
    expect(screen.getByText("Regal B")).toBeInTheDocument();
  });

  it("always shows the add-copy action for games:manage holders", () => {
    render(
      <GameCopiesSection
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={true}
      />,
    );

    expect(screen.getByText("Weiteres Exemplar")).toBeInTheDocument();
  });

  it("hides the add-copy action without games:manage", () => {
    render(
      <GameCopiesSection
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.queryByText("Weiteres Exemplar")).not.toBeInTheDocument();
  });
});

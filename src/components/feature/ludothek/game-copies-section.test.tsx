import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameCopiesSection } from "@/components/feature/ludothek/game-copies-section";
import type { GameCopyRow } from "@/components/feature/ludothek/game-copies-section";

vi.mock(
  "@/components/widgets/board-game/edit-board-game-exemplar-dialog",
  () => ({
    EditBoardGameExemplarDialog: () => (
      <button type="button">Bearbeiten</button>
    ),
  }),
);
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => <button type="button">Weiteres Exemplar</button>,
}));
vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: () => <p>Aufenthalt-Aktionen</p>,
}));

afterEach(() => {
  cleanup();
});

function copy(overrides: Partial<GameCopyRow> = {}): GameCopyRow {
  return {
    id: "copy-1",
    zustand: "frei",
    unitChain: "Regal A",
    responsibleName: null,
    responsibleContact: { mailHref: null, telegramHref: null },
    condition: null,
    history: [],
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

  it("leads with the responsible person before the storage chain (#121)", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({
            unitChain: "Regal A",
            responsibleName: "Alex",
            responsibleContact: {
              mailHref: "mailto:alex@example.com",
              telegramHref: null,
            },
          }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    const cell = screen.getByText(/Regal A/);
    expect(cell.textContent).toBe("bei Alex → Regal A");
  });

  it("renders a table for more than one copy", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({ id: "copy-1", unitChain: "Regal A" }),
          copy({ id: "copy-2", unitChain: "Regal B" }),
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

  it("keeps a single copy's history collapsed until its toggle is clicked", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({
            history: [
              {
                id: "h1",
                origin: "Ersterfassung",
                target: "Regal A",
                startedAt: "1.1.2026",
                endedAt: null,
                confirmedAt: "2026-01-01T00:00:00.000Z",
                recordedByName: "Alex",
              },
            ],
          }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.queryByText("Aufenthalt-Aktionen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Details/ }));

    expect(screen.getByText("Aufenthalt-Aktionen")).toBeInTheDocument();
    expect(screen.getByText(/Ersterfassung → Regal A/)).toBeInTheDocument();
  });

  it("expands each table row's own history independently", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({ id: "copy-1", unitChain: "Regal A" }),
          copy({
            id: "copy-2",
            unitChain: "Regal B",
            history: [
              {
                id: "h2",
                origin: "Ausleihe",
                target: "Alex",
                startedAt: "2.1.2026",
                endedAt: null,
                confirmedAt: null,
                recordedByName: "Sam",
              },
            ],
          }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    const toggles = screen.getAllByRole("button", { name: /Details/ });
    expect(toggles).toHaveLength(2);

    fireEvent.click(toggles[1]);

    expect(screen.getByText(/Ausleihe → Alex/)).toBeInTheDocument();
  });
});

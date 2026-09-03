import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameCopiesSection } from "@/components/feature/ludothek/game-copies-section";
import type { GameCopyRow } from "@/components/feature/ludothek/game-copies-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => <button type="button">Weiteres Exemplar</button>,
}));
vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: () => <p>Aufenthalt-Aktionen</p>,
}));
vi.mock("@/components/widgets/game-holding/game-actions-menu", () => ({
  GameActionsMenu: ({
    copies,
  }: {
    copies: { id: string; isMine?: boolean }[];
  }) => <button type="button">Aktionen ({copies[0].id})</button>,
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
    isUnconfirmed: false,
    responsibleContact: {
      mailHref: null,
      telegramHref: null,
      signalHref: null,
      discordHandle: null,
      address: null,
    },
    responsibleProfilePictureUrl: null,
    responsibleProfilePictureVisibility: "INTERN",
    condition: null,
    ruleBookLanguages: [],
    inventoryNumber: null,
    isMine: false,
    history: [],
    isPrivate: false,
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

  it("shows a placeholder instead of nothing when the single copy has no Regelheft-Sprache set (#188-Folge)", () => {
    render(
      <GameCopiesSection
        copies={[copy({ ruleBookLanguages: [] })]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Regelheft: —")).toBeInTheDocument();
  });

  it("shows the set Regelheft-Sprache(n) for the single copy", () => {
    render(
      <GameCopiesSection
        copies={[copy({ ruleBookLanguages: ["DE", "EN"] })]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Regelheft: DE, EN")).toBeInTheDocument();
  });

  it("wires the actions menu for the single-copy card (#128)", () => {
    render(
      <GameCopiesSection
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    expect(screen.getByText("Aktionen (copy-1)")).toBeInTheDocument();
  });

  it("keeps the single-copy actions menu and expand chevron in the same right-aligned cluster (#141)", () => {
    render(
      <GameCopiesSection
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    const actionsButton = screen.getByText("Aktionen (copy-1)");
    const chevronButton = screen.getByRole("button", {
      name: "Details ausklappen",
    });

    expect(actionsButton.parentElement).toBe(chevronButton.parentElement);
  });

  it("wires the actions menu for every table row (#128)", () => {
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

    expect(screen.getByText("Aktionen (copy-1)")).toBeInTheDocument();
    expect(screen.getByText("Aktionen (copy-2)")).toBeInTheDocument();
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
              signalHref: null,
              discordHandle: null,
              address: null,
            },
          }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    // "A" vor dem Namen ist die MeepleAvatar-Fallback-Initiale (#412), da
    // jsdom das Bild nie lädt — siehe meeple-avatar.test.tsx.
    const cell = screen.getByText(/Regal A/);
    expect(cell.textContent).toBe("bei AAlex → Regal A");
  });

  // #456: unbestätigte Weitergabe war auf der Spieledetailseite nicht sichtbar.
  it("adds '(Unbestätigt)' behind the responsible person for an unconfirmed holding", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({
            unitChain: "Regal A",
            responsibleName: "Alex",
            isUnconfirmed: true,
          }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    const cell = screen.getByText(/Regal A/);
    expect(cell.textContent).toBe("bei AAlex (Unbestätigt) → Regal A");
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

describe("GameCopiesSection — Privatbesitz (#255-Folge)", () => {
  it("omits the actions menu for a private single-copy card", () => {
    render(
      <GameCopiesSection
        copies={[copy({ zustand: "privat", isPrivate: true })]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames
      />,
    );

    expect(screen.queryByText(/Aktionen \(/)).not.toBeInTheDocument();
  });

  it("omits the actions menu per private table row, keeps it for a club row", () => {
    render(
      <GameCopiesSection
        copies={[
          copy({ id: "copy-1", zustand: "frei" }),
          copy({ id: "copy-2", zustand: "privat", isPrivate: true }),
        ]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames
      />,
    );

    expect(screen.getByText("Aktionen (copy-1)")).toBeInTheDocument();
    expect(screen.queryByText("Aktionen (copy-2)")).not.toBeInTheDocument();
  });
});

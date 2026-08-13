import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameActionsCopy } from "./game-actions-menu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/ludothek/game-copies", () => ({
  requestCompletenessCheck: vi.fn(),
  createGameCopy: vi.fn(),
}));
vi.mock(
  "@/components/widgets/board-game/deinventorise-board-game-dialog",
  () => ({
    DeinventoriseBoardGameDialog: ({
      gameId,
      open,
    }: {
      gameId: string;
      open?: boolean;
    }) =>
      open === undefined ? (
        <button type="button">Deinventarisieren</button>
      ) : open ? (
        <p>Deinventarisieren-Dialog offen für {gameId}</p>
      ) : null,
  }),
);
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => <button type="button">Weiteres Exemplar</button>,
}));
vi.mock(
  "@/components/widgets/board-game/edit-board-game-exemplar-dialog",
  () => ({
    EditBoardGameExemplarDialog: ({
      copyId,
      triggerLabel,
      open,
    }: {
      copyId: string;
      triggerLabel?: string;
      open?: boolean;
    }) =>
      open === undefined ? (
        <button type="button">{triggerLabel ?? "Bearbeiten"}</button>
      ) : open ? (
        <p>Mängelvermerk-Dialog offen für {copyId}</p>
      ) : null,
  }),
);
vi.mock("@/components/widgets/game-holding/holding-mini-dialogs", () => ({
  BorrowGameDialog: ({
    gameCopyId,
    open,
  }: {
    gameCopyId: string;
    open?: boolean;
  }) =>
    open === undefined ? (
      <button type="button">Ausleihen</button>
    ) : open ? (
      <p>Ausleihen-Dialog offen für {gameCopyId}</p>
    ) : null,
  AcceptReturnDialog: ({
    gameCopyId,
    open,
  }: {
    gameCopyId: string;
    open?: boolean;
  }) =>
    open === undefined ? (
      <button type="button">Rückgabe</button>
    ) : open ? (
      <p>Rückgabe-Dialog offen für {gameCopyId}</p>
    ) : null,
  GiveToMeepleDialog: ({
    gameCopyId,
    open,
  }: {
    gameCopyId: string;
    open?: boolean;
  }) =>
    open === undefined ? (
      <button type="button">Weitergeben</button>
    ) : open ? (
      <p>Weitergeben-Dialog offen für {gameCopyId}</p>
    ) : null,
  RelocateGameDialog: ({
    gameCopyId,
    open,
  }: {
    gameCopyId: string;
    open?: boolean;
  }) =>
    open === undefined ? (
      <button type="button">Umlagern</button>
    ) : open ? (
      <p>Umlagern-Dialog offen für {gameCopyId}</p>
    ) : null,
}));

const { GameActionsMenu } = await import("./game-actions-menu");

afterEach(() => {
  cleanup();
});

function copy(overrides: Partial<GameActionsCopy> = {}): GameActionsCopy {
  return {
    id: "copy-1",
    zustand: "frei",
    locationChain: "Regal A",
    condition: null,
    ...overrides,
  };
}

describe("GameActionsMenu — single copy (unchanged behaviour)", () => {
  it("always shows the placeholder Aufenthalt entries", async () => {
    render(
      <GameActionsMenu
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    for (const label of [
      "Geprüft",
      "Ausleihen",
      "Weitergeben",
      "Rückgabe",
      "Umlagern",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it("hides the games:manage entries without permission", async () => {
    render(
      <GameActionsMenu
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(await screen.findByText("Geprüft")).toBeInTheDocument();
    expect(screen.queryByText("Prüfung anfordern")).not.toBeInTheDocument();
    expect(screen.queryByText("Weiteres Exemplar")).not.toBeInTheDocument();
    expect(screen.queryByText("Deinventarisieren")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Mängelvermerk bearbeiten"),
    ).not.toBeInTheDocument();
  });

  it("shows the games:manage entries for games:manage holders", async () => {
    render(
      <GameActionsMenu
        copies={[copy()]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(await screen.findByText("Prüfung anfordern")).toBeInTheDocument();
    expect(screen.getByText("Weiteres Exemplar")).toBeInTheDocument();
    expect(screen.getByText("Deinventarisieren")).toBeInTheDocument();
  });

  it("hides Weitergeben when the copy isn't with the current session (#128)", async () => {
    render(
      <GameActionsMenu
        copies={[copy({ isMine: false })]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(await screen.findByText("Ausleihen")).toBeInTheDocument();
    expect(screen.queryByText("Weitergeben")).not.toBeInTheDocument();
  });

  it("offers Mängelvermerk bearbeiten for games:manage holders (Plan-Schritt 10)", async () => {
    render(
      <GameActionsMenu
        copies={[copy({ condition: "Ecke eingedrückt" })]}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(
      await screen.findByText("Mängelvermerk bearbeiten"),
    ).toBeInTheDocument();
  });
});

describe("GameActionsMenu — several copies open the Exemplar-Auswahl-Popup first (Plan-Schritt 12)", () => {
  const TWO_COPIES = [
    copy({ id: "copy-1", zustand: "frei", locationChain: "Regal A" }),
    copy({ id: "copy-2", zustand: "ausgeliehen", locationChain: "bei Alex" }),
  ];

  it("opens the picker instead of the mini-dialog directly for an exemplar-bound action", async () => {
    render(
      <GameActionsMenu
        copies={TWO_COPIES}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(await screen.findByText("Ausleihen"));

    expect(await screen.findByText("Exemplar wählen")).toBeInTheDocument();
    expect(screen.getByText("Regal A")).toBeInTheDocument();
    expect(screen.getByText("bei Alex")).toBeInTheDocument();
    expect(
      screen.queryByText(/Ausleihen-Dialog offen/),
    ).not.toBeInTheDocument();
  });

  it("opens the correct mini-dialog with the chosen gameCopyId after picking", async () => {
    render(
      <GameActionsMenu
        copies={TWO_COPIES}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(await screen.findByText("Ausleihen"));
    fireEvent.click(await screen.findByText("bei Alex"));

    expect(
      await screen.findByText("Ausleihen-Dialog offen für copy-2"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Exemplar wählen")).not.toBeInTheDocument();
  });

  it("routes Mängelvermerk bearbeiten through the picker too", async () => {
    render(
      <GameActionsMenu
        copies={TWO_COPIES}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(await screen.findByText("Mängelvermerk bearbeiten"));
    fireEvent.click(await screen.findByText("Regal A"));

    expect(
      await screen.findByText("Mängelvermerk-Dialog offen für copy-1"),
    ).toBeInTheDocument();
  });

  it("skips the picker for 'Weiteres Exemplar hinzufügen'", async () => {
    render(
      <GameActionsMenu
        copies={TWO_COPIES}
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        canManageGames={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(await screen.findByText("Weiteres Exemplar")).toBeInTheDocument();
    expect(screen.queryByText("Exemplar wählen")).not.toBeInTheDocument();
  });
});

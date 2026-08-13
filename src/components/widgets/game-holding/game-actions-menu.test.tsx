import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
    DeinventoriseBoardGameDialog: () => (
      <button type="button">Deinventarisieren</button>
    ),
  }),
);
vi.mock("@/components/widgets/board-game/add-game-copy-dialog", () => ({
  AddGameCopyDialog: () => <button type="button">Weiteres Exemplar</button>,
}));
vi.mock(
  "@/components/widgets/board-game/edit-board-game-exemplar-dialog",
  () => ({
    EditBoardGameExemplarDialog: ({
      triggerLabel,
    }: {
      triggerLabel?: string;
    }) => <button type="button">{triggerLabel ?? "Bearbeiten"}</button>,
  }),
);
vi.mock("@/components/widgets/game-holding/holding-mini-dialogs", () => ({
  BorrowGameDialog: () => <button type="button">Ausleihen</button>,
  AcceptReturnDialog: () => <button type="button">Rückgabe</button>,
  GiveToMeepleDialog: () => <button type="button">Weitergeben</button>,
  RelocateGameDialog: () => <button type="button">Umlagern</button>,
}));

const { GameActionsMenu } = await import("./game-actions-menu");

afterEach(() => {
  cleanup();
});

describe("GameActionsMenu", () => {
  it("always shows the placeholder Aufenthalt entries", async () => {
    render(
      <GameActionsMenu
        gameCopyId="copy-1"
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
        gameCopyId="copy-1"
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
        gameCopyId="copy-1"
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

  it("offers Mängelvermerk bearbeiten for games:manage holders (Plan-Schritt 10)", async () => {
    render(
      <GameActionsMenu
        gameCopyId="copy-1"
        boardGameId="game-1"
        boardGameTitle="Arche Nova"
        condition="Ecke eingedrückt"
        canManageGames={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(
      await screen.findByText("Mängelvermerk bearbeiten"),
    ).toBeInTheDocument();
  });
});

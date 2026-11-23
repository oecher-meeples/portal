import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameActionsCopy } from "./copy-action-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
const requestCompletenessCheckMock = vi.fn().mockResolvedValue({});
vi.mock("@/lib/ludothek/game-copies", () => ({
  requestCompletenessCheck: (...args: unknown[]) =>
    requestCompletenessCheckMock(...args),
}));
vi.mock("./copy-action-dialog", () => ({
  CopyActionDialog: ({
    action,
    copy,
  }: {
    action: string;
    copy: { id: string };
  }) => (
    <p>
      {action}-Dialog offen für {copy.id}
    </p>
  ),
}));

const { GameCopyQuickActions } = await import("./game-copy-quick-actions");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function copy(overrides: Partial<GameActionsCopy> = {}): GameActionsCopy {
  return {
    id: "copy-1",
    zustand: "frei",
    locationChain: "Regal A › Kiste 3",
    condition: null,
    ruleBookLanguages: [],
    inventoryNumber: 42,
    ...overrides,
  };
}

function renderBar(props: {
  copy?: GameActionsCopy;
  canManageGames?: boolean;
}) {
  render(
    <GameCopyQuickActions
      inventoryNumber={42}
      boardGameId="game-1"
      boardGameTitle="Arche Nova"
      canManageGames={props.canManageGames ?? false}
      copy={props.copy}
    />,
  );
}

describe("GameCopyQuickActions (#548)", () => {
  it("names the selected copy for guests, without state or actions", () => {
    renderBar({});

    expect(screen.getByText("Exemplar inv-42")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Regal A/)).not.toBeInTheDocument();
  });

  it("offers only the sensible actions for a free copy", () => {
    renderBar({ copy: copy() });

    expect(screen.getByText("Regal A › Kiste 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ausleihen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Umlagern" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rückgabe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Weitergeben" }),
    ).not.toBeInTheDocument();
  });

  it("offers Weitergeben and Rückgabe to the member holding the copy", () => {
    renderBar({
      copy: copy({ zustand: "ausgeliehen-verfuegbar", isMine: true }),
    });

    expect(
      screen.getByRole("button", { name: "Weitergeben" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rückgabe" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ausleihen" }),
    ).not.toBeInTheDocument();
  });

  it("adds admin actions for games:manage but never Deinventarisieren", () => {
    renderBar({ copy: copy(), canManageGames: true });

    expect(
      screen.getByRole("button", { name: "Prüfung anfordern" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Exemplar bearbeiten" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Deinventarisieren" }),
    ).not.toBeInTheDocument();
  });

  it("opens the action's dialog for this exact copy", async () => {
    renderBar({ copy: copy() });

    fireEvent.click(screen.getByRole("button", { name: "Ausleihen" }));

    expect(
      await screen.findByText("borrow-Dialog offen für copy-1"),
    ).toBeInTheDocument();
  });

  it("requests a completeness check without a dialog", async () => {
    renderBar({ copy: copy(), canManageGames: true });

    fireEvent.click(screen.getByRole("button", { name: "Prüfung anfordern" }));

    await vi.waitFor(() =>
      expect(requestCompletenessCheckMock).toHaveBeenCalledWith("copy-1"),
    );
  });
});

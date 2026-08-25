import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const addExplainerGameMock = vi.fn();
const updateExplainerGameLevelMock = vi.fn();
const removeExplainerGameMock = vi.fn();
vi.mock("@/lib/explainer/actions", () => ({
  addExplainerGame: (...args: unknown[]) => addExplainerGameMock(...args),
  updateExplainerGameLevel: (...args: unknown[]) =>
    updateExplainerGameLevelMock(...args),
  removeExplainerGame: (...args: unknown[]) => removeExplainerGameMock(...args),
}));

const { MyExplainerGames } = await import("./my-explainer-games");

const AVAILABLE_GAMES = [
  { id: "game-1", title: "Arche Nova" },
  { id: "game-2", title: "Wingspan" },
];

describe("MyExplainerGames — Combobox-Suche (#210)", () => {
  it("adds the selected game with level WITH_MANUAL via the combobox", async () => {
    const user = userEvent.setup();
    addExplainerGameMock.mockResolvedValue({ success: true });
    render(<MyExplainerGames myGames={[]} availableGames={AVAILABLE_GAMES} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Arche Nova" }));

    expect(addExplainerGameMock).toHaveBeenCalledWith("game-1", "WITH_MANUAL");
  });

  it("excludes games the Meeple already has an entry for", async () => {
    const user = userEvent.setup();
    render(
      <MyExplainerGames
        myGames={[
          {
            boardGameId: "game-1",
            boardGameTitle: "Arche Nova",
            level: "WITH_MANUAL",
          },
        ]}
        availableGames={AVAILABLE_GAMES}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(
      screen.queryByRole("option", { name: "Arche Nova" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: "Wingspan" }),
    ).toBeInTheDocument();
  });

  it("keeps the quick-edit toggle and removal for existing entries", async () => {
    const user = userEvent.setup();
    removeExplainerGameMock.mockResolvedValue({ success: true });
    render(
      <MyExplainerGames
        myGames={[
          {
            boardGameId: "game-1",
            boardGameTitle: "Arche Nova",
            level: "WITH_MANUAL",
          },
        ]}
        availableGames={AVAILABLE_GAMES}
      />,
    );

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Entfernen" }));

    expect(removeExplainerGameMock).toHaveBeenCalledWith("game-1");
  });
});

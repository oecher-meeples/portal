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
const removeAllExplainerGamesMock = vi.fn();
vi.mock("@/lib/explainer/actions", () => ({
  addExplainerGame: (...args: unknown[]) => addExplainerGameMock(...args),
  updateExplainerGameLevel: (...args: unknown[]) =>
    updateExplainerGameLevelMock(...args),
  removeExplainerGame: (...args: unknown[]) => removeExplainerGameMock(...args),
  removeAllExplainerGames: (...args: unknown[]) =>
    removeAllExplainerGamesMock(...args),
}));

const { MyExplainerGames } = await import("./my-explainer-games");

const AVAILABLE_GAMES = [
  { id: "game-1", title: "Arche Nova" },
  { id: "game-2", title: "Wingspan" },
];

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Neues Spiel hinzufügen" }),
  );
}

describe("MyExplainerGames — Dialog mit Combobox-Suche (#210)", () => {
  it("adds the selected game with the chosen level via the dialog", async () => {
    const user = userEvent.setup();
    addExplainerGameMock.mockResolvedValue({ success: true });
    render(<MyExplainerGames myGames={[]} availableGames={AVAILABLE_GAMES} />);

    await openAddDialog(user);
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Arche Nova" }));
    await user.click(screen.getByRole("button", { name: "Ohne Anleitung" }));
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(addExplainerGameMock).toHaveBeenCalledWith(
      "game-1",
      "WITHOUT_MANUAL",
    );
  });

  it("disables the submit button until a game is selected", async () => {
    const user = userEvent.setup();
    render(<MyExplainerGames myGames={[]} availableGames={AVAILABLE_GAMES} />);

    await openAddDialog(user);

    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
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

    await openAddDialog(user);
    await user.click(screen.getByRole("combobox"));
    expect(
      screen.queryByRole("option", { name: "Arche Nova" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: "Wingspan" }),
    ).toBeInTheDocument();
  });
});

describe("MyExplainerGames — Liste (#210)", () => {
  it("changes the level via the row slider", async () => {
    const user = userEvent.setup();
    updateExplainerGameLevelMock.mockResolvedValue({ success: true });
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

    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{End}");

    expect(updateExplainerGameLevelMock).toHaveBeenCalledWith(
      "game-1",
      "BY_HEART",
    );
  });

  it("asks for confirmation before removing an entry", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
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

    await user.click(screen.getByRole("button", { name: /Entfernen/ }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Arche Nova wirklich als Erklärbär-Eintrag entfernen?",
    );
    expect(removeExplainerGameMock).toHaveBeenCalledWith("game-1");
  });

  it("does not remove the entry when the confirmation is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
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

    await user.click(screen.getByRole("button", { name: /Entfernen/ }));

    expect(removeExplainerGameMock).not.toHaveBeenCalled();
  });

  it("filters the list by title", async () => {
    const user = userEvent.setup();
    render(
      <MyExplainerGames
        myGames={[
          {
            boardGameId: "game-1",
            boardGameTitle: "Arche Nova",
            level: "WITH_MANUAL",
          },
          {
            boardGameId: "game-2",
            boardGameTitle: "Wingspan",
            level: "WITH_MANUAL",
          },
        ]}
        availableGames={AVAILABLE_GAMES}
      />,
    );

    await user.type(screen.getByLabelText("Spiele filtern"), "wing");

    expect(screen.queryByText("Arche Nova")).not.toBeInTheDocument();
    expect(screen.getByText("Wingspan")).toBeInTheDocument();
  });

  it("hides the bulk-remove button when there are no own entries", () => {
    render(<MyExplainerGames myGames={[]} availableGames={AVAILABLE_GAMES} />);

    expect(
      screen.queryByRole("button", { name: "Alle Spiele entfernen" }),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation before removing all entries", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    removeAllExplainerGamesMock.mockResolvedValue({ success: true });
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

    await user.click(
      screen.getByRole("button", { name: "Alle Spiele entfernen" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Wirklich alle eigenen Erklärbär-Einträge entfernen?",
    );
    expect(removeAllExplainerGamesMock).toHaveBeenCalled();
  });
});

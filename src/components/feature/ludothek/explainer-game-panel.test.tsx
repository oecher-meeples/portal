import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
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

const { ExplainerGamePanel } = await import("./explainer-game-panel");

function activeButtons() {
  return screen
    .getAllByRole("button")
    .filter((button) =>
      ["Mit Anleitung", "Ohne Anleitung", "Im Schlaf"].includes(
        button.textContent ?? "",
      ),
    )
    .filter((button) => button.className.includes("bg-primary"));
}

describe("ExplainerGamePanel", () => {
  it("shows no active level button when the member has not registered yet", () => {
    render(
      <ExplainerGamePanel
        boardGameId="game-1"
        boardGameTitle="Ark Nova"
        explainers={[]}
        myLevel={null}
      />,
    );

    expect(screen.getByText("Ich kann das erklären")).toBeInTheDocument();
    expect(activeButtons()).toHaveLength(0);
  });

  it("shows exactly one active level button when the member is registered", () => {
    render(
      <ExplainerGamePanel
        boardGameId="game-1"
        boardGameTitle="Ark Nova"
        explainers={[]}
        myLevel="WITH_MANUAL"
      />,
    );

    expect(screen.getByText("Du kannst das erklären")).toBeInTheDocument();
    expect(activeButtons()).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Mit Anleitung" }),
    ).toHaveClass("bg-primary");
  });

  it("removes the registration and ends with no active button when clicking the active level", async () => {
    const user = userEvent.setup();
    removeExplainerGameMock.mockResolvedValue(undefined);

    render(
      <ExplainerGamePanel
        boardGameId="game-1"
        boardGameTitle="Ark Nova"
        explainers={[]}
        myLevel="WITH_MANUAL"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mit Anleitung" }));

    expect(removeExplainerGameMock).toHaveBeenCalledWith("game-1");
    expect(activeButtons()).toHaveLength(0);
  });

  it("switches the active level when clicking an inactive level while registered", async () => {
    const user = userEvent.setup();
    updateExplainerGameLevelMock.mockResolvedValue({ error: undefined });

    render(
      <ExplainerGamePanel
        boardGameId="game-1"
        boardGameTitle="Ark Nova"
        explainers={[]}
        myLevel="WITH_MANUAL"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ohne Anleitung" }));

    expect(updateExplainerGameLevelMock).toHaveBeenCalledWith(
      "game-1",
      "WITHOUT_MANUAL",
    );
    expect(activeButtons()).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Ohne Anleitung" }),
    ).toHaveClass("bg-primary");
  });
});

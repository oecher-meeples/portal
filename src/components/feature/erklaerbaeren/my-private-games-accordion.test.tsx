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

const addMock = vi.fn();
const removeMock = vi.fn();
vi.mock("@/lib/explainer/actions", () => ({
  addExplainerGame: (...args: unknown[]) => addMock(...args),
  removeExplainerGame: (...args: unknown[]) => removeMock(...args),
}));

const { MyPrivateGamesAccordion } =
  await import("./my-private-games-accordion");

const GAMES = [
  {
    boardGameId: "g-1",
    boardGameTitle: "Azul",
    isExpansion: false,
    level: null,
  },
  {
    boardGameId: "g-2",
    boardGameTitle: "Wingspan",
    isExpansion: false,
    level: "BY_HEART" as const,
  },
];

async function expand(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /Meine Spiele aus BGG/ }),
  );
}

describe("MyPrivateGamesAccordion (#654)", () => {
  it("renders nothing without imported games", () => {
    const { container } = render(<MyPrivateGamesAccordion games={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sets the level of a not yet registered game", async () => {
    const user = userEvent.setup();
    addMock.mockResolvedValue({ success: true });
    render(<MyPrivateGamesAccordion games={GAMES} />);
    await expand(user);

    await user.click(
      screen.getAllByRole("button", { name: "Ohne Anleitung" })[0],
    );

    expect(addMock).toHaveBeenCalledWith("g-1", "WITHOUT_MANUAL");
  });

  it("removes the entry when the active level is clicked again", async () => {
    const user = userEvent.setup();
    removeMock.mockResolvedValue({ success: true });
    render(<MyPrivateGamesAccordion games={GAMES} />);
    await expand(user);

    await user.click(screen.getAllByRole("button", { name: "Im Schlaf" })[1]);

    expect(removeMock).toHaveBeenCalledWith("g-2");
  });

  it("filters games by title", async () => {
    const user = userEvent.setup();
    render(<MyPrivateGamesAccordion games={GAMES} />);
    await expand(user);

    await user.type(screen.getByLabelText("Spiele filtern"), "wing");

    expect(screen.queryByText("Azul")).not.toBeInTheDocument();
    expect(screen.getByText("Wingspan")).toBeInTheDocument();
  });
});

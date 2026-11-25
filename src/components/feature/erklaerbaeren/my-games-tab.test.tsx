import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

const addExplainerGame = vi.fn().mockResolvedValue({ success: true });
const removeExplainerGame = vi.fn().mockResolvedValue({ success: true });
const addExplainerGameFromSearch = vi.fn().mockResolvedValue({ success: true });
const searchBoardGamesAction = vi
  .fn()
  .mockResolvedValue([{ id: "g-9", title: "Azul" }]);
vi.mock("@/lib/explainer/actions", () => ({
  addExplainerGame: (...a: unknown[]) => addExplainerGame(...a),
  removeExplainerGame: (...a: unknown[]) => removeExplainerGame(...a),
  addExplainerGameFromSearch: (...a: unknown[]) =>
    addExplainerGameFromSearch(...a),
  searchBoardGamesAction: (...a: unknown[]) => searchBoardGamesAction(...a),
}));

const { MyGamesTab } = await import("./my-games-tab");

const GAMES = [
  {
    boardGameId: "g-1",
    boardGameTitle: "Wingspan",
    imageUrl: null,
    bggId: 266192,
    isExpansion: false,
    wanted: true,
    level: null,
  },
  {
    boardGameId: "g-2",
    boardGameTitle: "Ahnen",
    imageUrl: null,
    bggId: null,
    isExpansion: true,
    wanted: false,
    level: "BY_HEART" as const,
  },
];

describe("MyGamesTab (#663)", () => {
  it("renders exclusive filter links, Relevante active by default", () => {
    render(<MyGamesTab games={GAMES} filter="relevant" />);

    const links = screen
      .getAllByRole("link")
      .filter((l) => l.closest("nav"))
      .map((l) => [l.textContent, l.getAttribute("href")]);
    expect(links).toEqual([
      ["Relevante", "/erklaerbaeren"],
      ["Meine", "/erklaerbaeren?filter=meine"],
      ["Gesucht", "/erklaerbaeren?filter=gesucht"],
      ["Bekannte", "/erklaerbaeren?filter=bekannte"],
    ]);
    expect(screen.getByRole("link", { name: "Relevante" })).toHaveClass(
      "bg-primary",
    );
    expect(screen.getByRole("link", { name: "Gesucht" })).not.toHaveClass(
      "bg-primary",
    );
  });

  it("shows title links, expansion and wanted badges", () => {
    render(<MyGamesTab games={GAMES} filter="relevant" />);

    expect(screen.getByRole("link", { name: /Wingspan/ })).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgame/266192",
    );
    expect(screen.getByText("Erweiterung")).toBeInTheDocument();
    expect(screen.getByText("Erklärer gesucht")).toBeInTheDocument();
  });

  it("sets a level on a game without one", async () => {
    render(<MyGamesTab games={GAMES} filter="wanted" />);

    const [firstToggle] = screen.getAllByRole("group", {
      name: "Erfahrungsstufe",
    });
    await userEvent.click(firstToggle.querySelectorAll("button")[1]);

    expect(addExplainerGame).toHaveBeenCalledWith("g-1", "WITHOUT_MANUAL");
  });

  it("removes only my level via the trash button; disabled without a level", async () => {
    render(<MyGamesTab games={GAMES} filter="relevant" />);

    expect(
      screen.getByRole("button", {
        name: "Wingspan: mein Niveau entfernen",
      }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Ahnen: mein Niveau entfernen" }),
    );

    expect(removeExplainerGame).toHaveBeenCalledWith("g-2");
  });

  it("adds a searched game with the default level via the server search", async () => {
    render(<MyGamesTab games={[]} filter="relevant" />);

    await userEvent.type(screen.getByPlaceholderText(/Spiel suchen/), "azu");
    await userEvent.click(
      await screen.findByRole("button", { name: "Azul" }, { timeout: 2000 }),
    );

    await waitFor(() =>
      expect(addExplainerGameFromSearch).toHaveBeenCalledWith("g-9"),
    );
    expect(searchBoardGamesAction).toHaveBeenCalledWith("azu", []);
  });

  it("shows a filter-specific empty state", () => {
    render(<MyGamesTab games={[]} filter="wanted" />);

    expect(
      screen.getByText("Für kein Spiel werden gerade Erklärer gesucht."),
    ).toBeInTheDocument();
  });
});

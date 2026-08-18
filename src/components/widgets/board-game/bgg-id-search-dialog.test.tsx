import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BggIdSearchDialog } from "@/components/widgets/board-game/bgg-id-search-dialog";

const searchBggGamesActionMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  searchBggGamesAction: (...args: unknown[]) =>
    searchBggGamesActionMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BggIdSearchDialog", () => {
  it("disables the trigger when the title is blank", () => {
    render(<BggIdSearchDialog title="" onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    ).toBeDisabled();
  });

  it("shows title and year per hit", async () => {
    const user = userEvent.setup();
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [
        { bggId: 342942, title: "Ark Nova", yearPublished: 2021 },
        { bggId: 12345, title: "Ark Nova: Marschmoor", yearPublished: 2023 },
      ],
    });

    render(<BggIdSearchDialog title="Ark Nova" onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    );

    await screen.findByText("Ark Nova");
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("Ark Nova: Marschmoor")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(searchBggGamesActionMock).toHaveBeenCalledWith("Ark Nova");
  });

  it("selects a hit via double-click and confirms immediately", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [{ bggId: 342942, title: "Ark Nova", yearPublished: 2021 }],
    });

    render(<BggIdSearchDialog title="Ark Nova" onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    );

    const row = await screen.findByText("Ark Nova");
    await user.dblClick(row);

    expect(onSelect).toHaveBeenCalledWith("342942");
  });

  it("selects a hit via click and confirms via the Übernehmen button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchBggGamesActionMock.mockResolvedValue({
      success: true,
      results: [{ bggId: 342942, title: "Ark Nova", yearPublished: 2021 }],
    });

    render(<BggIdSearchDialog title="Ark Nova" onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    );

    const confirmButton = screen.getByRole("button", { name: "Übernehmen" });
    expect(confirmButton).toBeDisabled();

    await user.click(await screen.findByText("Ark Nova"));
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(onSelect).toHaveBeenCalledWith("342942");
  });

  it("shows an error when nothing is found", async () => {
    const user = userEvent.setup();
    searchBggGamesActionMock.mockResolvedValue({ success: true, results: [] });

    render(<BggIdSearchDialog title="Unbekanntes Spiel" onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    );

    expect(
      await screen.findByText("Keine Treffer auf BoardGameGeek gefunden."),
    ).toBeInTheDocument();
  });

  it("shows a speaking error instead of the hit list when the search fails", async () => {
    const user = userEvent.setup();
    searchBggGamesActionMock.mockResolvedValue({
      success: false,
      error:
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });

    render(<BggIdSearchDialog title="Ark Nova" onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "BGG-ID per Namenssuche finden" }),
    );

    expect(
      await screen.findByText(
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      ),
    ).toBeInTheDocument();
  });
});

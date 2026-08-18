import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlternateNamesManager } from "@/components/widgets/board-game/alternate-names-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const listAlternateNamesMock = vi.fn();
const addAlternateNameMock = vi.fn();
const deleteAlternateNameMock = vi.fn();
const promoteAlternateNameToTitleMock = vi.fn();
vi.mock("@/lib/ludothek/board-game-alternate-names", () => ({
  listAlternateNames: (...args: unknown[]) => listAlternateNamesMock(...args),
  addAlternateName: (...args: unknown[]) => addAlternateNameMock(...args),
  deleteAlternateName: (...args: unknown[]) => deleteAlternateNameMock(...args),
  promoteAlternateNameToTitle: (...args: unknown[]) =>
    promoteAlternateNameToTitleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AlternateNamesManager", () => {
  it("loads and shows the alternate names on mount", async () => {
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [
        { id: "alt-1", name: "Die Siedler von Catan", note: null },
      ],
    });

    render(<AlternateNamesManager boardGameId="game-1" />);

    expect(
      await screen.findByText("Die Siedler von Catan"),
    ).toBeInTheDocument();
    expect(listAlternateNamesMock).toHaveBeenCalledWith("game-1");
  });

  it("shows a placeholder when there are no alternate names", async () => {
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [],
    });

    render(<AlternateNamesManager boardGameId="game-1" />);

    expect(
      await screen.findByText("Keine Alternativnamen hinterlegt."),
    ).toBeInTheDocument();
  });

  it("adds a new alternate name and refreshes the list", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock
      .mockResolvedValueOnce({ success: true, alternateNames: [] })
      .mockResolvedValueOnce({
        success: true,
        alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
      });
    addAlternateNameMock.mockResolvedValue({ success: true });

    render(<AlternateNamesManager boardGameId="game-1" />);

    await screen.findByText("Keine Alternativnamen hinterlegt.");
    await user.type(
      screen.getByPlaceholderText("Neuer Alternativname"),
      "Catan",
    );
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() =>
      expect(addAlternateNameMock).toHaveBeenCalledWith("game-1", "Catan"),
    );
    expect(await screen.findByText("Catan")).toBeInTheDocument();
  });

  it("deletes an alternate name via the icon button after confirmation (#203)", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listAlternateNamesMock
      .mockResolvedValueOnce({
        success: true,
        alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
      })
      .mockResolvedValueOnce({ success: true, alternateNames: [] });
    deleteAlternateNameMock.mockResolvedValue({ success: true });

    render(<AlternateNamesManager boardGameId="game-1" />);

    await screen.findByText("Catan");
    await user.click(screen.getByRole("button", { name: "„Catan“ löschen" }));

    expect(window.confirm).toHaveBeenCalledWith("„Catan“ wirklich löschen?");
    await waitFor(() =>
      expect(deleteAlternateNameMock).toHaveBeenCalledWith("alt-1"),
    );
  });

  it("promotes an alternate name to the main title", async () => {
    const user = userEvent.setup();
    listAlternateNamesMock.mockResolvedValue({
      success: true,
      alternateNames: [{ id: "alt-1", name: "Catan", note: null }],
    });
    promoteAlternateNameToTitleMock.mockResolvedValue({ success: true });

    render(<AlternateNamesManager boardGameId="game-1" />);

    await user.click(
      await screen.findByRole("button", {
        name: "Als Hauptname übernehmen",
      }),
    );

    await waitFor(() =>
      expect(promoteAlternateNameToTitleMock).toHaveBeenCalledWith("alt-1"),
    );
  });
});

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkImportBoardGamesDialog } from "@/components/widgets/board-game/bulk-import-board-games-dialog";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const bulkImportBoardGamesMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bulk-import", () => ({
  bulkImportBoardGames: (...args: unknown[]) =>
    bulkImportBoardGamesMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Massenimport/ }));
}

describe("BulkImportBoardGamesDialog", () => {
  it("splits the textarea into one name per line and shows the result list", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "imported",
          bggId: 342942,
          title: "Ark Nova",
        },
        {
          name: "Unbekanntes Spiel",
          status: "needs-review",
          candidates: [],
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    await user.type(
      screen.getByLabelText("Spieletitel"),
      "Ark Nova\nUnbekanntes Spiel",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(bulkImportBoardGamesMock).toHaveBeenCalledWith([
      "Ark Nova",
      "Unbekanntes Spiel",
    ]);
    expect(await screen.findByText("Importiert")).toBeInTheDocument();
    expect(
      screen.getByText("Nicht eindeutig — bitte manuell prüfen"),
    ).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("lists the ambiguous candidates for a needs-review row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Catan",
          status: "needs-review",
          candidates: [
            { bggId: 1, title: "Catan", yearPublished: 1995 },
            { bggId: 2, title: "Catan (Neuauflage)", yearPublished: 2015 },
          ],
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel"), "Catan");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(await screen.findByText(/BGG-ID 1/)).toBeInTheDocument();
    expect(screen.getByText(/BGG-ID 2/)).toBeInTheDocument();
  });

  it("shows the failure reason for a failed row", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      success: true,
      results: [
        {
          name: "Ark Nova",
          status: "failed",
          error: "BoardGameGeek ist aktuell nicht erreichbar.",
        },
      ],
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(
      await screen.findByText("BoardGameGeek ist aktuell nicht erreichbar."),
    ).toBeInTheDocument();
  });

  it("shows a speaking error instead of results when the whole run fails", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({
      error: "Keine Berechtigung.",
    });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);
    await user.type(screen.getByLabelText("Spieletitel"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(await screen.findByText("Keine Berechtigung.")).toBeInTheDocument();
  });

  it("disables the import button while the textarea is empty", async () => {
    const user = userEvent.setup();
    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    expect(screen.getByRole("button", { name: "Importieren" })).toBeDisabled();
  });
});

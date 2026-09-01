import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkImportBoardGamesDialog } from "@/components/widgets/board-game/bulk-import-board-games-dialog";

// Split out of bulk-import-board-games-dialog.test.tsx (#289) — the
// Trennzeichen-Dropdown coverage pushed the original file past the
// 400-line limit.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const bulkImportBoardGamesMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bulk-import", () => ({
  bulkImportBoardGames: (...args: unknown[]) =>
    bulkImportBoardGamesMock(...args),
  resolveBulkImportCandidate: vi.fn(),
}));

vi.mock("@/components/ui/code-scanner", () => ({
  CodeScanner: () => null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Massenimport/ }));
}

describe("BulkImportBoardGamesDialog — Trennzeichen-Dropdown (#289)", () => {
  it("passes the chosen Trennzeichen through to bulkImportBoardGames", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({ success: true, results: [] });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: ";" }));
    await user.type(
      screen.getByLabelText("Spieletitel oder EAN"),
      "OM-0142;Ark Nova",
    );
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(bulkImportBoardGamesMock).toHaveBeenCalledWith(
      ["OM-0142;Ark Nova"],
      ";",
    );
  });

  it("defaults to 'Kein Trennzeichen' (no delimiter)", async () => {
    const user = userEvent.setup();
    bulkImportBoardGamesMock.mockResolvedValue({ success: true, results: [] });

    render(<BulkImportBoardGamesDialog />);
    await openDialog(user);

    await user.type(screen.getByLabelText("Spieletitel oder EAN"), "Ark Nova");
    await user.click(screen.getByRole("button", { name: "Importieren" }));

    expect(bulkImportBoardGamesMock).toHaveBeenCalledWith(
      ["Ark Nova"],
      undefined,
    );
  });
});

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDialog } from "@/components/widgets/board-game/create-board-game-dialog.test-helpers";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: vi.fn(),
  findDuplicateBoardGame: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: vi.fn(),
  searchBggGamesAction: vi.fn(),
}));

vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: vi
    .fn()
    .mockResolvedValue({ success: true, results: [] }),
}));

vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: vi.fn(),
}));

vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: () => null,
}));
vi.mock(
  "@/components/widgets/board-game/create-board-game-location-field",
  () => ({
    CreateBoardGameLocationField: () => null,
  }),
);

const { CreateBoardGameDialog } = await import("./create-board-game-dialog");

describe("CreateBoardGameDialog — defaultBggQuery (#183)", () => {
  it("prefills the import field from an already-typed Ludothek search", async () => {
    const user = userEvent.setup();

    render(<CreateBoardGameDialog defaultBggQuery="Ark Nova" />);
    const dialog = await openDialog(user);

    expect(within(dialog).getByLabelText(/Titel, BGG-Link/)).toHaveValue(
      "Ark Nova",
    );
  });

  it("clears the prefilled query via the clear button", async () => {
    const user = userEvent.setup();

    render(<CreateBoardGameDialog defaultBggQuery="Ark Nova" />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Eingabe löschen" }),
    );

    expect(within(dialog).getByLabelText(/Titel, BGG-Link/)).toHaveValue("");
  });

  it("picks up a query typed after mount — re-seeded on open, not frozen at mount time", async () => {
    const user = userEvent.setup();

    const { rerender } = render(<CreateBoardGameDialog defaultBggQuery="" />);
    // Simulates the Ludothek search box updating live while the dialog
    // component itself stays mounted the whole time (#183 follow-up).
    rerender(<CreateBoardGameDialog defaultBggQuery="Ark Nova" />);

    await user.click(screen.getByRole("button", { name: "Spiel anlegen" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText(/Titel, BGG-Link/)).toHaveValue(
      "Ark Nova",
    );
  });
});

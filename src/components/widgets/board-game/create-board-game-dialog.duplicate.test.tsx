import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  openDialog,
  skipImportStep,
  submitBggInput,
} from "@/components/widgets/board-game/create-board-game-dialog.test-helpers";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const createBoardGameMock = vi.fn();
const findDuplicateBoardGameMock = vi.fn();
const getBoardGameTitleForEditMock = vi.fn();
const updateBoardGameMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: (...args: unknown[]) => createBoardGameMock(...args),
  findDuplicateBoardGame: (...args: unknown[]) =>
    findDuplicateBoardGameMock(...args),
  getBoardGameTitleForEdit: (...args: unknown[]) =>
    getBoardGameTitleForEditMock(...args),
  updateBoardGame: (...args: unknown[]) => updateBoardGameMock(...args),
}));

// Pulled in via `EditBoardGameTitle` → `TitleOverviewDialog` →
// `AlternateNamesManager` (#203) — never opened here, just needs to import
// cleanly (its permission check otherwise reaches for `next/headers`).
vi.mock("@/lib/ludothek/board-game-alternate-names", () => ({
  addAlternateName: vi.fn(),
  deleteAlternateName: vi.fn(),
  promoteAlternateNameToTitle: vi.fn(),
  listAlternateNames: vi
    .fn()
    .mockResolvedValue({ success: true, alternateNames: [] }),
}));

const previewBggImportMock = vi.fn();
const searchBggGamesActionMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
  searchBggGamesAction: (...args: unknown[]) =>
    searchBggGamesActionMock(...args),
}));

vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: vi
    .fn()
    .mockResolvedValue({ success: true, results: [] }),
}));

const createGameCopyMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: (...args: unknown[]) => createGameCopyMock(...args),
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

beforeEach(() => {
  // Default: no duplicate — individual tests override this to exercise the warning.
  findDuplicateBoardGameMock.mockResolvedValue(null);
});

const { CreateBoardGameDialog } = await import("./create-board-game-dialog");

function reviewNextButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", {
    name: "Weiter",
  });
}

function useExistingCopyButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", {
    name: "Weiteres Exemplar anlegen",
  });
}

describe("CreateBoardGameDialog — Duplikat-Erkennung (#183)", () => {
  it("routes a BGG-import duplicate straight to the exemplar step instead of creating a second title", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: null,
        description: null,
        mechanics: [],
        explainerVideoUrl: null,
        germanExplainerVideos: [],
        englishExplainerVideos: [],
      },
    });
    findDuplicateBoardGameMock.mockResolvedValue({
      id: "game-existing",
      title: "Ark Nova",
    });
    createGameCopyMock.mockResolvedValue({ success: true, id: "copy-1" });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "342942");

    await waitFor(() =>
      expect(findDuplicateBoardGameMock).toHaveBeenCalledWith(
        "Ark Nova",
        342942,
      ),
    );
    expect(
      await within(dialog).findByText("existiert bereits im Bestand", {
        exact: false,
      }),
    ).toBeInTheDocument();
    // "Weiter" no longer creates a second title once a duplicate is known.
    expect(
      within(dialog).queryByRole("button", { name: "Weiter" }),
    ).not.toBeInTheDocument();

    await user.click(useExistingCopyButton(dialog));

    expect(
      within(dialog).getByText("Schritt 3 von 3 — Exemplar-Daten"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Ark Nova", { exact: false }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /Spiel anlegen|Speichere/ }),
    );

    await waitFor(() =>
      expect(createGameCopyMock).toHaveBeenCalledWith("game-existing", {
        condition: undefined,
      }),
    );
    expect(createBoardGameMock).not.toHaveBeenCalled();
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("routes a manually typed duplicate title straight to the exemplar step (debounced check)", async () => {
    const user = userEvent.setup();
    findDuplicateBoardGameMock.mockResolvedValue({
      id: "game-existing",
      title: "Arche Nova",
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");

    await waitFor(() =>
      expect(findDuplicateBoardGameMock).toHaveBeenCalledWith(
        "Arche Nova",
        null,
      ),
    );
    expect(
      await within(dialog).findByText("existiert bereits im Bestand", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("wird dabei verworfen", { exact: false }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Titel")).toHaveClass(
      "border-amber-600",
    );
    expect(
      within(dialog).queryByRole("button", { name: "Weiter" }),
    ).not.toBeInTheDocument();

    await user.click(useExistingCopyButton(dialog));

    expect(
      within(dialog).getByText("Schritt 3 von 3 — Exemplar-Daten"),
    ).toBeInTheDocument();
  });

  it("loads the real title data via 'Titel laden' instead of discarding the input, allowing corrections", async () => {
    const user = userEvent.setup();
    findDuplicateBoardGameMock.mockResolvedValue({
      id: "game-existing",
      title: "Arche Nova",
    });
    getBoardGameTitleForEditMock.mockResolvedValue({
      title: "Arche Nova",
      ean: "5901234123457",
      kind: "BOARDGAME",
      bggId: 342942,
      minPlayers: 1,
      maxPlayers: 4,
      playTimeMinutes: 150,
      weight: 3.7,
      imageUrl: null,
      description: null,
      mechanics: [],
      explainerVideoUrl: null,
      germanExplainerVideos: [],
      englishExplainerVideos: [],
    });
    updateBoardGameMock.mockResolvedValue({ success: true, hint: undefined });
    createGameCopyMock.mockResolvedValue({ success: true, id: "copy-1" });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");
    await waitFor(() =>
      expect(findDuplicateBoardGameMock).toHaveBeenCalledWith(
        "Arche Nova",
        null,
      ),
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Titel laden" }),
    );

    await waitFor(() =>
      expect(getBoardGameTitleForEditMock).toHaveBeenCalledWith(
        "game-existing",
      ),
    );
    // The warning clears once the loaded title matches itself — "Weiter"
    // reappears and lets the admin continue after correcting fields.
    expect(
      await within(dialog).findByRole("button", { name: "Weiter" }),
    ).toBeEnabled();
    expect(within(dialog).getByLabelText("EAN")).toHaveValue("5901234123457");

    await user.click(within(dialog).getByRole("button", { name: "Weiter" }));
    await user.click(
      within(dialog).getByRole("button", { name: /Spiel anlegen|Speichere/ }),
    );

    await waitFor(() =>
      expect(updateBoardGameMock).toHaveBeenCalledWith(
        "game-existing",
        expect.objectContaining({ title: "Arche Nova", bggId: 342942 }),
      ),
    );
    expect(createGameCopyMock).toHaveBeenCalledWith("game-existing", {
      condition: undefined,
    });
    expect(createBoardGameMock).not.toHaveBeenCalled();
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalledTimes(1));
  });

  it("does not warn and still allows creating a new title when no match exists", async () => {
    const user = userEvent.setup();
    findDuplicateBoardGameMock.mockResolvedValue(null);

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    await user.type(within(dialog).getByLabelText("Titel"), "Ganz neu");

    await waitFor(() =>
      expect(findDuplicateBoardGameMock).toHaveBeenCalledWith("Ganz neu", null),
    );
    expect(
      screen.queryByText("existiert bereits im Bestand", { exact: false }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Titel")).not.toHaveClass(
      "border-amber-600",
    );
    expect(reviewNextButton(dialog)).toBeEnabled();
  });

  it("surfaces the server-side hard block if a duplicate slips through client-side detection", async () => {
    const user = userEvent.setup();
    findDuplicateBoardGameMock.mockResolvedValue(null);
    createBoardGameMock.mockResolvedValue({
      error:
        "„Arche Nova“ existiert bereits im Bestand. Bitte über „Weiteres Exemplar anlegen“ eine weitere Kopie dieses Titels anlegen, statt einen zweiten Titel mit demselben Namen zu erzeugen.",
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");
    await waitFor(() => expect(findDuplicateBoardGameMock).toHaveBeenCalled());
    await user.click(reviewNextButton(dialog));
    await user.click(
      within(dialog).getByRole("button", { name: /Spiel anlegen|Speichere/ }),
    );

    expect(
      await within(dialog).findByText(
        "„Arche Nova“ existiert bereits im Bestand. Bitte über „Weiteres Exemplar anlegen“ eine weitere Kopie dieses Titels anlegen, statt einen zweiten Titel mit demselben Namen zu erzeugen.",
      ),
    ).toBeInTheDocument();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});

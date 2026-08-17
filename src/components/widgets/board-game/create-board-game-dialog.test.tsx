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
  goNext,
  openDialog,
  skipImportStep,
  submitBggInput,
  submitButton,
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
vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: (...args: unknown[]) => createBoardGameMock(...args),
  findDuplicateBoardGame: (...args: unknown[]) =>
    findDuplicateBoardGameMock(...args),
}));

const previewBggImportMock = vi.fn();
const searchBggGamesActionMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
  searchBggGamesAction: (...args: unknown[]) =>
    searchBggGamesActionMock(...args),
}));

const createGameCopyMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  createGameCopy: (...args: unknown[]) => createGameCopyMock(...args),
}));

vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned("4001504311892")}>
      simulate-scan
    </button>
  ),
}));
vi.mock(
  "@/components/widgets/board-game/create-board-game-location-field",
  () => ({
    CreateBoardGameLocationField: () => null,
  }),
);

beforeEach(() => {
  // Default: no duplicate — the dedicated duplicate-detection suite overrides this.
  findDuplicateBoardGameMock.mockResolvedValue(null);
});

const { CreateBoardGameDialog } = await import("./create-board-game-dialog");

describe("CreateBoardGameDialog — manueller Wizard-Durchlauf (EAN-Scan)", () => {
  it("submits the scanned EAN together with the title and closes the dialog on success", async () => {
    const user = userEvent.setup();
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "game-1",
      hint: undefined,
    });

    // defaultEan opens the dialog straight away at step 2 — a scan already
    // identifies the physical copy, the BGG-import step brings nothing here.
    render(<CreateBoardGameDialog defaultEan="5901234123457" />);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");
    expect(within(dialog).getByLabelText("EAN")).toHaveValue("5901234123457");

    await goNext(dialog, user);
    await user.click(submitButton(dialog));

    await waitFor(() => expect(createBoardGameMock).toHaveBeenCalledTimes(1));
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Arche Nova",
        ean: "5901234123457",
        condition: undefined,
      }),
    );
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sets the EAN field from a simulated scan (#121/#122)", async () => {
    const user = userEvent.setup();
    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    await user.click(within(dialog).getByText("simulate-scan"));

    expect(within(dialog).getByLabelText("EAN")).toHaveValue("4001504311892");
  });

  it("shows the server error instead of crashing when the session has expired", async () => {
    const user = userEvent.setup();
    createBoardGameMock.mockRejectedValue(
      new Error(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    );

    render(<CreateBoardGameDialog defaultEan="5901234123457" />);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");
    await goNext(dialog, user);
    await user.click(submitButton(dialog));

    expect(
      await within(dialog).findByText(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    ).toBeInTheDocument();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});

describe("CreateBoardGameDialog — Wizard-Navigation", () => {
  it("skips the BGG-import step and lands on the review step with a blank form", async () => {
    const user = userEvent.setup();

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await skipImportStep(dialog, user);

    expect(within(dialog).getByLabelText("Titel")).toHaveValue("");
    expect(
      within(dialog).getByText("Schritt 2 von 3 — Angaben prüfen"),
    ).toBeInTheDocument();
  });

  it("goes back from the review step to the import step without losing the preview", async () => {
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

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await submitBggInput(dialog, user, "342942");
    await waitFor(() =>
      expect(within(dialog).findByText("Ark Nova")).resolves.toBeTruthy(),
    );
    await goNext(dialog, user);

    await user.click(within(dialog).getByRole("button", { name: "Zurück" }));

    expect(
      within(dialog).getByText("Schritt 1 von 3 — BGG-Import"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Ark Nova")).toBeInTheDocument();
  });

  it("blocks advancing from the review step while the title is empty", async () => {
    const user = userEvent.setup();

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);
    await skipImportStep(dialog, user);

    expect(
      within(dialog).getByRole("button", { name: "Weiter" }),
    ).toBeDisabled();
  });
});

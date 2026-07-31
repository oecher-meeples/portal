import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const createBoardGameMock = vi.fn();
const previewBggImportMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  createBoardGame: (...args: unknown[]) => createBoardGameMock(...args),
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
}));

const { CreateBoardGameDialog } = await import("./create-board-game-dialog");

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Spiel anlegen" }));
  return screen.findByRole("dialog");
}

function submitButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", {
    name: /Spiel anlegen|Speichere/,
  });
}

describe("CreateBoardGameDialog — manual entry via EAN", () => {
  it("submits the scanned EAN together with the title and closes the dialog on success", async () => {
    const user = userEvent.setup();
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "game-1",
      hint: undefined,
    });

    // defaultEan opens the dialog straight away, prefilled from the barcode scan.
    render(<CreateBoardGameDialog defaultEan="5901234123457" />);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Titel"), "Arche Nova");
    expect(within(dialog).getByLabelText("EAN")).toHaveValue("5901234123457");

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
    await user.click(submitButton(dialog));

    expect(
      await within(dialog).findByText(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    ).toBeInTheDocument();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});

describe("CreateBoardGameDialog — BGG-ID import", () => {
  it("loads the BGG preview, prefills the title and submits the enriched data", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: true,
      data: {
        title: "Ark Nova",
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        weight: 3.7,
        imageUrl: "https://example.com/ark-nova.png",
        description: "Zoo-Aufbauspiel",
        mechanics: ["Engine Building"],
        explainerVideoUrl: null,
      },
    });
    createBoardGameMock.mockResolvedValue({
      success: true,
      id: "game-2",
      hint: undefined,
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Via BGG-ID" }),
    );
    await user.type(within(dialog).getByLabelText("BGG-ID"), "342942");
    await user.click(
      within(dialog).getByRole("button", { name: "Vorschau laden" }),
    );

    await waitFor(() =>
      expect(previewBggImportMock).toHaveBeenCalledWith(342942),
    );
    expect(await within(dialog).findByText("Ark Nova")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Titel")).toHaveValue("Ark Nova");

    await user.click(submitButton(dialog));

    await waitFor(() => expect(createBoardGameMock).toHaveBeenCalledTimes(1));
    expect(createBoardGameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ark Nova",
        bggId: 342942,
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 150,
        mechanics: ["Engine Building"],
      }),
    );
  });

  it("shows a speaking error and never calls createBoardGame when the BGG-ID is unknown", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });

    render(<CreateBoardGameDialog />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Via BGG-ID" }),
    );
    await user.type(within(dialog).getByLabelText("BGG-ID"), "999999999");
    await user.click(
      within(dialog).getByRole("button", { name: "Vorschau laden" }),
    );

    expect(
      await within(dialog).findByText(
        "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
      ),
    ).toBeInTheDocument();
    expect(createBoardGameMock).not.toHaveBeenCalled();
  });
});

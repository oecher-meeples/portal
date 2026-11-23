import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const createLfgPostMock = vi.fn();
vi.mock("@/components/feature/lfg/actions", () => ({
  createLfgPost: (...args: unknown[]) => createLfgPostMock(...args),
}));

const { CreateLfgDialog } = await import("./create-lfg-dialog");

describe("CreateLfgDialog", () => {
  it("renders the standalone trigger by default", () => {
    render(<CreateLfgDialog />);

    expect(
      screen.getByRole("button", { name: /Gesuch erstellen/ }),
    ).toBeInTheDocument();
  });

  it("renders a custom trigger instead when one is passed (#142)", async () => {
    const user = userEvent.setup();
    render(
      <CreateLfgDialog
        trigger={<button type="button">Spielergesuch eröffnen</button>}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Gesuch erstellen/ }),
    ).not.toBeInTheDocument();

    const dialog = await (async () => {
      await user.click(
        screen.getByRole("button", { name: "Spielergesuch eröffnen" }),
      );
      return screen.findByRole("dialog");
    })();

    expect(dialog).toBeInTheDocument();
  });

  it("prefills the form from a game's detail page (#142)", async () => {
    const user = userEvent.setup();
    render(
      <CreateLfgDialog
        trigger={<button type="button">Spielergesuch eröffnen</button>}
        defaultGameTitle="Arche Nova"
        defaultBoardGameId="game-1"
        defaultMaxParticipants={5}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Spielergesuch eröffnen" }),
    );
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByLabelText("Spiel (Freitext, optional)"),
    ).toHaveValue("Arche Nova");
    expect(within(dialog).getByLabelText("Max. Teilnehmer")).toHaveValue(5);

    await user.type(within(dialog).getByLabelText("Titel"), "Rundentitel");
    await user.type(
      within(dialog).getByLabelText("Beschreibung"),
      "Wer hat Lust?",
    );
    createLfgPostMock.mockResolvedValue({ success: true, id: "post-1" });
    await user.click(
      within(dialog).getByRole("button", { name: "Gesuch veröffentlichen" }),
    );

    expect(createLfgPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gameTitle: "Arche Nova",
        boardGameId: "game-1",
        maxParticipants: 5,
      }),
    );
  });
});
